document.addEventListener('DOMContentLoaded', function() {
  document.body.innerHTML = document.body.innerHTML.replace(/window\.parent\.goTo/g, 'window.offlineGoTo');
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
        document.title = section + ' - ' + page[0];
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
