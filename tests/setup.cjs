const { chrome } = require("jest-chrome");
global.chrome = chrome;

chrome.i18n.getMessage.mockImplementation((key) => key);
