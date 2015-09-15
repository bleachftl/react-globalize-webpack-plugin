var extend = require("util")._extend;
<<<<<<< HEAD
var Extractor = require("./Extractor");
=======
var Extractor = require('./Extractor');
var reactGlobalizeCompiler = require("react-globalize-compiler");
>>>>>>> pass extractDefaultMessages and/or extractMessages

function alwaysArray(stringOrArray) {
  return Array.isArray(stringOrArray) ? stringOrArray : stringOrArray ? [stringOrArray] : [];
}

function arrayClone(array) {
  return array.slice(0);
}

// Returns new deeply merged JSON.
//
// Eg.
// merge( { a: { b: 1, c: 2 } }, { a: { b: 3, d: 4 } } )
// -> { a: { b: 3, c: 2, d: 4 } }
//
// @arguments JSON's
function merge() {
  var destination = {},
    sources = [].slice.call(arguments, 0);
  sources.forEach(function(source) {
    var prop;
    for (prop in source) {
      if (prop in destination && typeof destination[prop] === "object" && !Array.isArray(destination[prop])) {
        // Merge Objects
        destination[prop] = merge(destination[prop], source[prop]);
      } else {
        // Set new values
        destination[prop] = source[prop];
      }
    }
  });
  return destination;
}

function objectDeepClone(object) {
  return merge(object);
}

function ProductionModePlugin(attributes) {
  this.attributes = attributes;
}

ProductionModePlugin.prototype.apply = function(compiler) {
  var attributes = this.attributes;
  var defaultLocale = attributes.developmentLocale;
  var extractor = new Extractor();

  // Map eash AST and its request filepath.
  compiler.parser.plugin("program", function(ast) {
    extractor.asts[this.state.current.request] = ast;
  });

  // Sneaks in modules that `require("react-globalize")` and create custom
  // precompiled formatters/parsers for them.
  compiler.parser.plugin("call require:commonjs:item", function(expr, param) {
    var request = this.state.current.request;
    if(param.isString() && param.string === "react-globalize") {
      extractor.getDefaultMessages(request);
      extractor.getExtracts(request);
    }
  });

  compiler.plugin("globalize-before-compile-extracts", function(locale, attributes, request) {
    var extracts = extractor.getExtracts(request);
    var defaultMessages = extractor.getDefaultMessages(request);

    if (extracts) {
      attributes.extracts = attributes.extracts ? arrayClone(alwaysArray(attributes.extracts)) : [];
      [].push.apply(attributes.extracts, alwaysArray(extracts));
    }

    if (defaultMessages) {
      attributes.messages = attributes.messages ? objectDeepClone(attributes.messages) : {};
      attributes.messages[locale] = attributes.messages[locale] || {};
      extend(attributes.messages[locale], defaultMessages);
    }

    process.nextTick(writeMessages, locale, attributes.messages[locale]);
  });

  function writeMessages(locale, messages) {
    var path = attributes.messages.replace("[locale]", locale);
    var extractDefault = attributes.extractDefaultMessages || attributes.extractAllMessages

    if (extractDefault && locale === defaultLocale) {
      reactGlobalizeCompiler.generateDefaultTranslation({
        path,
        defaultLocale,
        messages
      });
    } else if (attributes.extractAllMessages) {
      reactGlobalizeCompiler.initOrUpdateTranslation({
        path,
        locale,
        messages
      });
    }
  }
};

module.exports = ProductionModePlugin;
