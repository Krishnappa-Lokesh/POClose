/*global QUnit*/

jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

sap.ui.require([
	"sap/ui/test/Opa5",
	"srmpocls/POClose/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"srmpocls/POClose/test/integration/pages/Worklist",
	"srmpocls/POClose/test/integration/pages/Object",
	"srmpocls/POClose/test/integration/pages/NotFound",
	"srmpocls/POClose/test/integration/pages/Browser",
	"srmpocls/POClose/test/integration/pages/App"
], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "srmpocls.POClose.view."
	});

	sap.ui.require([
		"srmpocls/POClose/test/integration/WorklistJourney",
		"srmpocls/POClose/test/integration/ObjectJourney",
		"srmpocls/POClose/test/integration/NavigationJourney",
		"srmpocls/POClose/test/integration/NotFoundJourney",
		"srmpocls/POClose/test/integration/FLPIntegrationJourney"
	], function () {
		QUnit.start();
	});
});