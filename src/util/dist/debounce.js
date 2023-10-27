"use strict";
exports.__esModule = true;
exports.debounce = void 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce(func, waitMilliseconds) {
    var timeoutId;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var doLater = function () {
            clearTimeout(timeoutId);
            func.apply(void 0, args);
        };
        clearTimeout(timeoutId);
        timeoutId = setTimeout(doLater, waitMilliseconds);
    };
}
exports.debounce = debounce;
