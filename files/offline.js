document.addEventListener('DOMContentLoaded', function() {
  document.body.innerHTML = document.body.innerHTML.replace(/window\.parent\.goTo/g, 'window.offlineGoTo');

  // Remove Edit button
  document.querySelector('#button').style.display = 'none';

  // Add table of contents support for Dash
  var constructor = [].filter.call(document.querySelectorAll('h2'),
    function(el) {
      return el.innerText === 'Constructor';
    })[0];

  if (constructor &&
    constructor.nextElementSibling.tagName === 'H3') {

    constructor = constructor.nextElementSibling;
    var parenthese = constructor.innerHTML.indexOf('(');
    var anchor = document.createElement('a');
    anchor.classList.add('dashAnchor');
    anchor.name = '//apple_ref/cpp/Constructor/' +
      constructor.innerHTML.substr(0, parenthese);

    constructor.insertBefore(anchor, constructor.childNodes[0]);
  }

  [].forEach.call(document.querySelectorAll('a[id]'), function(el) {
    var type = el;

    while (type.parentNode) {
      if (type.parentNode.tagName === 'BODY') break;
      type = type.parentNode;
    }

    while (type) {
      if (type.tagName === 'H2') break;
      type = type.previousElementSibling;
    }

    if (type) {
      switch (true) {
        case /properties/i.test(type.innerText):
          type = 'Property';
          break;
        case /methods/i.test(type.innerText):
          type = 'Method';
          break;
        default:
          type = false;
      }
    }

    if (type) {
      el.classList.add('dashAnchor');
      el.name = '//apple_ref/cpp/' + type + '/' + el.innerText;
    } else {
      return false;
    }
  });

}, false);

var DELIMITER = '/';
var MEMBER_DELIMITER = '.';
var nameCategoryMap = {};

for ( var section in list ) {
  for ( var category in list[ section ] ) {
    for ( var i = 0; i < list[ section ][ category ].length; i ++ ) {

      var page = list[ section ][ category ][ i ];

      nameCategoryMap[page[0]] = {
        section: section,
        category: category,
        name: page[0],
      };

      if (~window.location.pathname.indexOf(page[1])) {
        document.title = page[0];
      }

    }
  }
}

function offlineGoTo( section, category, name, member ) {
  var parts, location;

  // Fully resolve links that only provide a name
  if(arguments.length == 1) {

    // Resolve links of the form 'Class.member'
    if(section.indexOf(MEMBER_DELIMITER) !== -1) {
      parts = section.split(MEMBER_DELIMITER);
      section = parts[0];
      member = parts[1];
    }

    location = nameCategoryMap[section];
    if (!location) return;
    section = location.section;
    category = location.category;
    name = location.name;
  }

  var pathname = window.location.pathname;
  window.location.pathname = pathname.substr(0,
    pathname.lastIndexOf('/Documents/') + '/Documents/'.length) +
    pages[ section ][ category ][ name ] + '.html' +
    (!!member ? '#'+member : '');
}
