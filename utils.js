// Ref.: https://github.com/date-fns/date-fns/blob/master/src/differenceInHours/index.js
function differenceInHours(dateLeft, dateRight) {
    const MILLISECONDS_IN_HOUR = 3600000;
    const diffInMilliseconds = dateLeft.getTime() - dateRight.getTime();
    const diff = diffInMilliseconds / MILLISECONDS_IN_HOUR;

    return diff > 0 ? Math.floor(diff) : Math.ceil(diff);
}

module.exports = {
    differenceInHours
 }