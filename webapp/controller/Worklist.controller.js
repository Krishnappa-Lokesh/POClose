/*global location history */
sap.ui.define([
	"srmpocls/POClose/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"srmpocls/POClose/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/m/Token"
], function (BaseController,
	JSONModel,
	History,
	formatter,
	Filter,
	FilterOperator,
	MessageToast,
	Token) {
	"use strict";

	return BaseController.extend("srmpocls.POClose.controller.Worklist", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function () {
			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			// keeps the search state
			this._aTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
				saveAsTileTitle: this.getResourceBundle().getText("saveAsTileTitle", this.getResourceBundle().getText("worklistViewTitle")),
				shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableClosedDataText: this.getResourceBundle().getText("tableClosedDataText"),

				tableBusyDelay: 0,
				dataChanged: false,
				selectionMode: true,
				aSelectedOrders: []
			});
			this.setModel(oViewModel, "worklistView");

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function () {
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});
			// Add the worklist page to the flp routing history
			this.addHistoryEntry({
				title: this.getResourceBundle().getText("worklistViewTitle"),
				icon: "sap-icon://table-view",
				intent: "#SRMPOCloseApplication-display"
			}, true);

			this.getView().getModel("worklistView").attachPropertyChange(function () {
				this.setViewDataChanged(this.getModel().hasPendingChanges());
			}.bind(this));

			var oMultiInput = this.getView().byId("multiInputPO");
			oMultiInput.addValidator(function (args) {
				var text = args.text;
				return new Token({
					key: text,
					text: text
				});
			});
		},

		onAfterRendering: function () {

		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress: function (oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},
		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function (oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				if (!this.getModel("worklistView").getProperty("/selectionMode")) {
					sTitle = this.getResourceBundle().getText("worklistTableClosedTitleCount", [iTotalItems]);
				} else {
					sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
				}
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);

		},

		multiInputBtnSearchPressed: function (oEvent) {
			var oMultiInput = this.getView().byId("multiInputPO");
			var aTokens = oMultiInput.getTokens();
			var aTableSearchState = [];
			aTokens.forEach(function (element) {
				aTableSearchState.push(new Filter("ObjectId", FilterOperator.EQ, element.getProperty("key")));

			});

			this._applySearch(aTableSearchState);
		},

		multiInputBtnRefreshPressed: function (oEvent) {
			var oMultiInput = this.getView().byId("multiInputPO");
			var aTableSearchState = [];
			oMultiInput.removeAllTokens();
			this._applySearch(aTableSearchState);
		},

		onSegmentedBtnPressed: function (oEvent) {
			var oSource = oEvent.getSource();
			var sSelectedBtnKey = oSource.getSelectedKey();

			var oTable = this.getView().byId("table");
			var oItems = oTable.getItems();

			Object.keys(oItems).forEach(function (nItemIndex) {
				var sPath = oItems[nItemIndex].getBindingContextPath();
				var oBindingContext = oItems[nItemIndex].getBindingContext();
				var sDocClosed = oBindingContext.getModel().getProperty(sPath + '/DocClosed');
				var sPoStatus = oBindingContext.getModel().getProperty(sPath + '/PoStatus');

				if (sSelectedBtnKey === "selSegBtn2") {
					if (!sDocClosed && sPoStatus === '') {
						oBindingContext.getModel().setProperty(sPath + "/Zselctd", "X");
					}
				} else {
					oBindingContext.getModel().setProperty(sPath + "/Zselctd", "");
				}

			});

			this.setViewDataChanged(this.getModel().hasPendingChanges());

		},

		onChangeCheckbox: function (event) {
			var oSource = event.getSource();
			var sValueCheckBox = oSource.getSelected();
			var sPathCheckBox = oSource.getBindingContext().sPath;

			var oTable = this.getView().byId("table");
			var oItems = oTable.getItems();
			var oModel = this.getOwnerComponent().getModel();

			Object.keys(oItems).forEach(function (nItemIndex) {
				var sPathCurrentItem = oItems[nItemIndex].getBindingContextPath();
				var aCells = oItems[nItemIndex].getCells();
				if (sPathCurrentItem === sPathCheckBox) {
					if (sValueCheckBox === true) {
						oModel.setProperty(sPathCurrentItem + "/Zselctd", "X");

					} else {
						oModel.setProperty(sPathCurrentItem + "/Zselctd", "");
					}
				}
			});

			this.setViewDataChanged(oModel.hasPendingChanges());

		},

		/**
		 * Event handler when the share in JAM button has been clicked
		 * @public
		 */
		onShareInJamPress: function () {
			var oViewModel = this.getModel("worklistView"),
				oShareDialog = sap.ui.getCore().createComponent({
					name: "sap.collaboration.components.fiori.sharing.dialog",
					settings: {
						object: {
							id: location.href,
							share: oViewModel.getProperty("/shareOnJamTitle")
						}
					}
				});
			oShareDialog.open();
		},

		onSearch: function (oEvent) {

			var aTableSearchState = [];
			var sQuery = oEvent.getParameter("query");

			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				//this.onRefresh();
			} else {

				if (sQuery && sQuery.length > 0) {
					aTableSearchState = [new Filter("ObjectId", FilterOperator.Contains, sQuery)];
				}
			}
			this._applySearch(aTableSearchState);

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function () {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},

		setViewDataChanged: function (bDataChanged) {

			var oViewModel = this.getView().getModel("worklistView");
			oViewModel.setProperty("/dataChanged", bDataChanged);
		},

		enableHeaderSearch: function (bDataChanged) {

			var oViewModel = this.getView().getModel("worklistView");
			oViewModel.setProperty("/selectionMode", bDataChanged);

		},

		/**
		 * Event handler (attached declaratively) for the view save button. Saves the changes added by the user. 
		 * @function
		 * @public
		 */

		onSave: function (oSBEvent) {

			var that = this,
				oModel = this.getModel(),
				oAppModel = this.getModel("appView"),
				oViewModel = this.getModel("worklistView");

			var oButton = this.byId("btnClosePo");
			if (oButton.getText() === "Done") {
				oButton.setText("Close PO");
				this._resetList();
				this.setViewDataChanged(false);
				this.enableHeaderSearch(true);
				return;
			}

			var oTable = this.byId("table");
			var oItems = oTable.getItems();
			var aSelectedOrders = [];

			Object.keys(oItems).forEach(function (nItemIndex) {
				var oLineItem = oItems[nItemIndex].getBindingContext().getObject();
				if (oLineItem.Zselctd === "X") {
					aSelectedOrders.push((oLineItem.ObjectId));
				}
			});
			oViewModel.setProperty('/aSelectedOrders', aSelectedOrders);

			oModel.submitChanges({
				// Success Message
				success: function () {
					MessageToast.show("Selected Purchase Orders processed successfully", {
						duration: 3000, // default
						width: "15em", // default
						my: sap.ui.core.Popup.Dock.CenterCenter,
						at: sap.ui.core.Popup.Dock.CenterCenter,
						of: window, // default
						offset: "0 0", // default
						collision: "fit fit", // default
						onClose: null, // default
						autoClose: false, // default
						animationTimingFunction: "ease", // default
						animationDuration: 1000, // default
						closeOnBrowserNavigation: true // default
					});

					oAppModel.setProperty("/busy", false);
					that._showClosedList();
					that.enableHeaderSearch(false);

				}

			}, {
				//Error Message
				error: function () {
					MessageToast.show("Error updating record");
				}
			});
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showObject: function (oItem) {
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("ObjectId")
			});
		},

		_showClosedList: function (oEvent) {
			var aSelectedOrders = this.getView().getModel("worklistView").getProperty('/aSelectedOrders');
			var aTableSearchState = [];
			aSelectedOrders.forEach(function (element) {
				aTableSearchState.push(new Filter("ObjectId", FilterOperator.EQ, element));

			});
			this._setfooterButtonText();
			this._applySearch(aTableSearchState);
		},

		_setfooterButtonText: function () {
			var oButton = this.byId("btnClosePo");

			if (oButton.getText() === "Done") {
				oButton.setText("Close PO");
			} else {
				oButton.setText("Done");
			}
		},

		_resetList: function (oEvent) {
			// reset selected orders
			var aSelectedOrders = [];
			this.getView().getModel("worklistView").setProperty('/aSelectedOrders', aSelectedOrders);

			this._applySearch(aSelectedOrders);
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
		_applySearch: function (aTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("items").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		}

	});
});