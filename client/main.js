// Todo: check that the ITP cookie changes are only activated on iOS >= 14.3 and not on Android
import { Cookies } from "meteor/ostrio:cookies";
import { HTTP } from "meteor/http";
import { Meteor } from "meteor/meteor";

const attachMsg = (node) => {
  const list = document.getElementById("output");
  list.appendChild(node);
};

const createListItem = (msg, style) => {
  const node = document.createElement("li");
  node.appendChild(document.createTextNode(msg));
  node.setAttribute("style", style);
  return node;
};

const assertEqual = (a, b, msg) => {
  const node = createListItem(msg, `color: ${a === b ? "green" : "red"};`);
  attachMsg(node);
};

const runTests = async () => {
  const cookieValue = `${Date.now()}`;
  const cookieParam = `__TEST_COOKIE__=${cookieValue}`;
  const ___expectedCookies___ = encodeURI(cookieParam);
  let cookieResetPath = Meteor.absoluteUrl("/__cookie_reset");
  let cookieTestPath = Meteor.absoluteUrl("/__cookie_match");

  const cookies = new Cookies({ allowQueryStringCookies: true });

  cookies.remove();
  assertEqual(document.cookie, "", "cookie is empty");
  await new Promise(resolve => {
    HTTP.get(
      cookieResetPath,
      {
        params: {
          ___removeCookie___: "__TEST_COOKIE__"
        },
        beforeSend(xhr) {
          xhr.withCredentials = true;
          return true;
        }
      },
      (err, res) => {
        assertEqual(res.statusCode, 200, "clear cookie request successful");
        resolve();
      }
    );
  });

  await new Promise(resolve => {
    HTTP.get(
      cookieTestPath,
      {
        params: {
          ___expectedCookies___: "undefined"
        },
        beforeSend(xhr) {
          xhr.withCredentials = true;
          return true;
        }
      },
      (err, res) => {
        assertEqual(res.statusCode, 200, "server did not receive cookie");
        resolve();
      }
    );
  });

  cookies.set("__TEST_COOKIE__", cookieValue);
  assertEqual(document.cookie, cookieParam, "set cookie on client");

  if (Meteor.isCordova) {
    await new Promise(resolve => {
      HTTP.get(
        cookieTestPath,
        {
          params: {
            ___expectedCookies___: "undefined"
          },
          beforeSend(xhr) {
            xhr.withCredentials = true;
            return true;
          }
        },
        (err, res) => {
          assertEqual(res.statusCode, 200, "no cookie received from cordova");
          resolve();
        }
      );
    });
  } else {
    await new Promise(resolve => {
      HTTP.get(
        cookieTestPath,
        {
          params: {
            ___expectedCookies___
          }
        },
        (err, res) => {
          assertEqual(
            res.statusCode,
            200,
            "server received cookie from browser"
          );
          resolve();
        }
      );
    });
  }

  await new Promise(resolve => cookies.send(resolve));

  // in cordova cookies set by the server are invisible by the client
  // but are sent within requests if withCredentials is true
  await new Promise(resolve => {
    HTTP.get(
      cookieTestPath,
      {
        params: {
          ___expectedCookies___
        },
        beforeSend(xhr) {
          xhr.withCredentials = true;
          return true;
        }
      },
      (err, res) => {
        assertEqual(res.statusCode, 200, "server received cookie after send()");
        resolve();
      }
    );
  });

  if (Meteor.isCordova) {
    // Todo: callback not fired
    // CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK]; should be used
    // await new Promise((resolve, reject) => window.WebviewProxy.clearCookie(resolve, reject));
    window.WebviewProxy.clearCookie();
    await new Promise(resolve => {
      HTTP.get(
        cookieTestPath,
        {
          params: {
            ___expectedCookies___: "undefined"
          }
        },
        (err, res) => {
          assertEqual(
            res.statusCode,
            200,
            "no cookie from cordova on clearCookie"
          );
          resolve();
        }
      );
    });
  } else {
    await new Promise(resolve => {
      HTTP.get(
        cookieTestPath,
        {
          params: {
            ___expectedCookies___
          }
        },
        (err, res) => {
          assertEqual(
            res.statusCode,
            200,
            "server received cookie from browser with withCredentials = false"
          );
          resolve();
        }
      );
    });
  }

  attachMsg(createListItem("all tests run!"));
};

console.log(document.readyState);

const func = () => {
  if (document.readyState === "complete") {
    runTests().catch(console.error);
  } else {
    setTimeout(func, 10)
  }
};


if (Meteor.isCordova) {
  const foo = Meteor.absoluteUrl;
  Meteor.absoluteUrl = function (url, opts) {
    return window.WebviewProxy.convertProxyUrl(foo(url, opts));
  }
  Meteor.absoluteUrl.defaultOptions = foo.defaultOptions;
  document.addEventListener('deviceready', () => {
    func();
  });
} else {
  func();
}
