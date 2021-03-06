/**
 * roles.js
 * Simple User roles manager/validator
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */

(function (exports) {
  const config = {
    roles: [
      "public", //(0)
      "user", //basic user (2)
      "admin", //administrator (4)
      "root" //God (8)
    ],

    accessLevels: {
      public: "*",
      anon: ["public"],
      user: ["user", "admin", "root"],
      admin: ["admin", "root"],
      root: ["root"]
    }
  };

  exports.userRoles = buildRoles(config.roles);
  exports.accessLevels = buildAccessLevels(
    config.accessLevels,
    exports.userRoles
  );

  exports.checkUserAccessLevel = function (userRole, accessLevel) {
    return (userRole.bitMask & accessLevel.bitMask) === userRole.bitMask;
  };

  exports.checkUser = function (userRole, role) {
    return userRole.bitMask === role.bitMask && userRole.title === role.title;
  };

  function buildRoles(roles) {
    let bitMask = "01";
    let userRoles = {};

    for (let role in roles) {
      let intCode = parseInt(bitMask, 2);
      userRoles[roles[role]] = {
        bitMask: intCode,
        title: roles[role]
      };
      bitMask = (intCode << 1).toString(2);
    }

    return userRoles;
  }

  function buildAccessLevels(accessLevelDeclarations, userRoles) {
    let accessLevels = {},
      resultBitMask;
    for (let level in accessLevelDeclarations) {
      if (typeof accessLevelDeclarations[level] === "string") {
        if (accessLevelDeclarations[level] === "*") {
          resultBitMask = "";

          for (let i=0; i<userRoles.length; i++) {
            resultBitMask += "1";
          }
          accessLevels[level] = {
            bitMask: parseInt(resultBitMask, 2)
          };
        } else
          console.log(
            "Access Control Error: Could not parse '" +
            accessLevelDeclarations[level] +
            "' as access definition for level '" +
            level +
            "'"
          );
      } else {
        resultBitMask = 0;
        for (let role in accessLevelDeclarations[level]) {
          if (userRoles.hasOwnProperty(accessLevelDeclarations[level][role]))
            resultBitMask =
            resultBitMask |
            userRoles[accessLevelDeclarations[level][role]].bitMask;
          else
            console.log(
              "Access Control Error: Could not find role '" +
              accessLevelDeclarations[level][role] +
              "' in registered roles while building access for '" +
              level +
              "'"
            );
        }
        accessLevels[level] = {
          bitMask: resultBitMask
        };
      }
    }

    return accessLevels;
  }
})(typeof exports === "undefined" ? (this["roles"] = {}) : exports);