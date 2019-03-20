sap.ui.define([
		"srmpocls/POClose/controller/BaseController"
	], function (BaseController) {
		"use strict";

		return BaseController.extend("srmpocls.POClose.controller.NotFound", {

			/**
			 * Navigates to the worklist when the link is pressed
			 * @public
			 */
			onLinkPressed : function () {
				this.getRouter().navTo("worklist");
			}

		});

	}
);