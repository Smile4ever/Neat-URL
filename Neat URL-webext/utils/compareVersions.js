// http://jsfiddle.net/ripper234/Xv9WL/28/
// https://stackoverflow.com/questions/6832596/how-to-compare-software-version-number-using-js-only-number

function assert(x) {
    if (!x) {
        //console.log("Assert failed");
        debugger;
    }
}

function isPositiveInteger(x) {
    // http://stackoverflow.com/a/1019526/11236
    return /^\d+$/.test(x);
}

/**
 * Compare two software version numbers (e.g. 1.7.1)
 * Returns:
 *
 *  0 if they're identical
 *  negative if v1 < v2
 *  positive if v1 > v2
 *  Nan if they in the wrong format
 *
 *  E.g.:
 *
 *  assert(version_number_compare("1.7.1", "1.6.10") > 0);
 *  assert(version_number_compare("1.7.1", "1.7.10") < 0);
 *
 *  "Unit tests": http://jsfiddle.net/ripper234/Xv9WL/28/
 *
 *  Taken from http://stackoverflow.com/a/6832721/11236
 */
function compareVersionNumbers(v1, v2){
    var v1parts = v1.split('.');
    var v2parts = v2.split('.');

    // First, validate both numbers are true version numbers
    function validateParts(parts) {
        for (var i = 0; i < parts.length; ++i) {
            if (!isPositiveInteger(parts[i])) {
                return false;
            }
        }
        return true;
    }
    if (!validateParts(v1parts) || !validateParts(v2parts)) {
        return NaN;
    }

    for (var i = 0; i < v1parts.length; ++i) {
        if (v2parts.length === i) {
            return 1;
        }

        if (v1parts[i] === v2parts[i]) {
            continue;
        }
        if (v1parts[i] > v2parts[i]) {
            return 1;
        }
        return -1;
    }

    if (v1parts.length != v2parts.length) {
        return -1;
    }

    return 0;
}


/*assert(compareVersionNumbers("1.7.1", "1.7.10") < 0);
assert(compareVersionNumbers("1.6.1", "1.7.10") < 0);
assert(compareVersionNumbers("1.6.20", "1.7.10") < 0);
assert(compareVersionNumbers("1.7.1", "1.7.10") < 0);
assert(compareVersionNumbers("1.7", "1.7.0") < 0);
assert(compareVersionNumbers("1.7", "1.8.0") < 0);

assert(compareVersionNumbers("1.7.10", "1.7.1") > 0);
assert(compareVersionNumbers("1.7.10", "1.6.1") > 0);
assert(compareVersionNumbers("1.7.10", "1.6.20") > 0);
assert(compareVersionNumbers("1.7.0", "1.7") > 0);
assert(compareVersionNumbers("1.8.0", "1.7") > 0);

assert(compareVersionNumbers("1.7.10", "1.7.10") === 0);
assert(compareVersionNumbers("1.7", "1.7") === 0);

assert(isNaN(compareVersionNumbers("1.7", "1..7")));
assert(isNaN(compareVersionNumbers("1.7", "Bad")));
assert(isNaN(compareVersionNumbers("1..7", "1.7")));
assert(isNaN(compareVersionNumbers("Bad", "1.7")));

alert("All done");*/
