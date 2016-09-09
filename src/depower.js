(function() {

  /**
   * Convert a ratio into a bit-shift count; for instance a ratio of 2
   * becomes a bit-shift of 1, while a ratio of 1 is a bit-shift of 0.
   *
   * @author Brion Vibber <brion@pobox.com>
   * @copyright 2016
   * @license MIT-style
   *
   * @param {number} ratio - the integer ratio to convert.
   * @returns number - number of bits to shift to multiply/divide by the ratio.
   * @throws exception if given a non-power-of-two
   */
  function depower(ratio) {
    var shiftCount = 0,
      n = ratio >> 1;
    while (n != 0) {
      n = n >> 1;
      shiftCount++
    }
    if (ratio !== (1 << shiftCount)) {
      throw 'chroma plane dimensions must be power of 2 ratio to luma plane dimensions; got ' + ratio;
    }
    return shiftCount;
  }

  module.exports = depower;
})();
