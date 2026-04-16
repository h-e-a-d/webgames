require('dotenv').config({ path: '.env.local' });

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("games");
  eleventyConfig.addPassthroughCopy("public");
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });

  // selectattr(arr, attr, val?) — filters array by attr (truthy check or equality)
  eleventyConfig.addFilter("selectattr", function (arr, attr, val) {
    if (!Array.isArray(arr)) return [];
    if (val === undefined) {
      return arr.filter(item => item[attr]);
    }
    return arr.filter(item => item[attr] === val);
  });

  // reject(arr, attr, val) — filters array where attr !== val
  eleventyConfig.addFilter("reject", function (arr, attr, val) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(item => item[attr] !== val);
  });

  // slice(arr, start, end) — slices array
  eleventyConfig.addFilter("slice", function (arr, start, end) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(start, end);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    htmlTemplateEngine: "njk",
  };
};
