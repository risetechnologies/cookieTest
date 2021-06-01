import { Cookies } from "meteor/ostrio:cookies";
import { HTTP } from "meteor/http";
import { Meteor } from "meteor/meteor";
import Bowser from "bowser";

const browser = Bowser.getParser(window.navigator.userAgent).parsedResult;

console.log(browser);

export const isIosCordova = Meteor.isCordova && browser.os.name === "iOS";
export const isAndroidCordova =
  Meteor.isCordova && browser.os.name === "Android";

const childPath = `${window.__meteor_runtime_config__.ROOT_URL}child`;

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

const addInAppBrowserLaunchButton = () => {
  const list = document.getElementById("output");
  const node = document.createElement("button");
  node.innerText = "launch in app browser";
  node.onclick = () => cordova.InAppBrowser.open(childPath, "_blank");
  list.appendChild(node);
  return node;
};

const addIFrame = (path) => {
  const list = document.getElementById("output");
  const node = document.createElement("iframe");
  node.src = `${window.__meteor_runtime_config__.ROOT_URL}${path}`;
  node.width = "300px";
  node.height = "100px";
  node.style = "border:1px solid black;";
  list.appendChild(node);
  const c = document.createElement("p");
  c.innerText = "Iframes not supported";
  node.appendChild(c);
  return node;
};

const assertEqual = (a, b, msg) => {
  const node = createListItem(msg, `color: ${a === b ? "green" : "red"};`);
  attachMsg(node);
};

const runTests = async () => {
  const cookieValue = "CookieTestValue";
  const cookieParam = `__TEST_COOKIE__=${cookieValue}`;
  const ___expectedCookies___ = encodeURI(cookieParam);
  const cookieResetPath = Meteor.absoluteUrl("/__cookie_reset");
  const cookieTestPath = Meteor.absoluteUrl("/__cookie_match");

  if (window.location.pathname === "/child") {
    await new Promise((resolve) => {
      HTTP.get(
        cookieTestPath,
        {
          params: {
            ___expectedCookies___: ___expectedCookies___,
          },
          beforeSend(xhr) {
            xhr.withCredentials = true;
            return true;
          },
        },
        (err, res) => {
          assertEqual(res.statusCode, 200, "cookie received from parent");
          resolve();
        }
      );
    });
  } else {
    const cookies = new Cookies({ allowQueryStringCookies: true });

    cookies.remove();
    assertEqual(document.cookie, "", "cookie is empty");
    await new Promise((resolve) => {
      HTTP.get(
        cookieResetPath,
        {
          params: {
            ___removeCookie___: "__TEST_COOKIE__",
          },
          beforeSend(xhr) {
            xhr.withCredentials = true;
            return true;
          },
        },
        (err, res) => {
          assertEqual(res.statusCode, 200, "clear cookie request successful");
          resolve();
        }
      );
    });

    await new Promise((resolve) => {
      HTTP.get(
        cookieTestPath,
        {
          params: {
            ___expectedCookies___: "undefined",
          },
          beforeSend(xhr) {
            xhr.withCredentials = true;
            return true;
          },
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
      await new Promise((resolve) => {
        HTTP.get(
          cookieTestPath,
          {
            params: {
              ___expectedCookies___: "undefined",
            },
            beforeSend(xhr) {
              xhr.withCredentials = true;
              return true;
            },
          },
          (err, res) => {
            assertEqual(res.statusCode, 200, "no cookie received from cordova");
            resolve();
          }
        );
      });
    } else {
      await new Promise((resolve) => {
        HTTP.get(
          cookieTestPath,
          {
            params: {
              ___expectedCookies___,
            },
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

    await new Promise((resolve) => cookies.send(resolve));

    // in cordova cookies set by the server are invisible by the client
    // but are sent within requests if withCredentials is true
    await new Promise((resolve) => {
      HTTP.get(
        cookieTestPath,
        {
          params: {
            ___expectedCookies___,
          },
          beforeSend(xhr) {
            xhr.withCredentials = true;
            return true;
          },
        },
        (err, res) => {
          assertEqual(
            res.statusCode,
            200,
            "server received cookie after send()"
          );
          resolve();
        }
      );
    });

    if (isIosCordova) {
      await new Promise((resolve, reject) =>
        window.WebviewProxy.clearCookies(resolve, reject)
      );
      await new Promise((resolve) => {
        HTTP.get(
          cookieTestPath,
          {
            params: {
              ___expectedCookies___: "undefined",
            },
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

      const url = new URL(window.__meteor_runtime_config__.ROOT_URL);
      await new Promise((resolve, reject) =>
        window.WebviewProxy.setCookie(
          {
            domain: url.hostname,
            path: "/",
            name: "__TEST_COOKIE__",
            value: cookieValue,
          },
          resolve,
          reject
        )
      );

      await new Promise((resolve) => {
        HTTP.get(
          cookieTestPath,
          {
            params: {
              ___expectedCookies___,
            },
          },
          (err, res) => {
            assertEqual(
              res.statusCode,
              200,
              "cookie set by WebviewProxy.setCookie()"
            );
            resolve();
          }
        );
      });

      await new Promise((resolve, reject) =>
        window.WebviewProxy.deleteCookie(
          {
            domain: url.hostname,
            name: "someInvalidName",
          },
          resolve,
          reject
        )
      );
      await new Promise((resolve) => {
        HTTP.get(
          cookieTestPath,
          {
            params: {
              ___expectedCookies___,
            },
          },
          (err, res) => {
            assertEqual(
              res.statusCode,
              200,
              "deleteCookie() deletes invalid cookie, test cookie is kept"
            );
            resolve();
          }
        );
      });
      await new Promise((resolve, reject) =>
        window.WebviewProxy.deleteCookie(
          {
            domain: url.hostname,
            name: "__TEST_COOKIE__",
          },
          resolve,
          reject
        )
      );
      await new Promise((resolve) => {
        HTTP.get(
          cookieTestPath,
          {
            params: {
              ___expectedCookies___: "undefined",
            },
          },
          (err, res) => {
            assertEqual(
              res.statusCode,
              200,
              "deleteCookie() deleted the test cookie successfully"
            );
            resolve();
          }
        );
      });

      await new Promise((resolve, reject) =>
        window.WebviewProxy.clearCookies(resolve, reject)
      );

      // either let the server set the cookie or set it in the client
      await new Promise((resolve, reject) =>
        window.WebviewProxy.setCookie(
          {
            domain: url.hostname,
            path: "/child",
            name: "__TEST_COOKIE__",
            value: cookieValue,
          },
          resolve,
          reject
        )
      );
      cookies.set("__TEST_COOKIE__", cookieValue);
      await new Promise((resolve) => cookies.send(resolve));

      addIFrame('child');
      addInAppBrowserLaunchButton();
    } else if (isAndroidCordova) {
      await new Promise((resolve) => {
        HTTP.get(
          cookieTestPath,
          {
            params: {
              ___expectedCookies___: "undefined",
            },
          },
          (err, res) => {
            assertEqual(
              res.statusCode,
              200,
              "no cookie from cordova with withCredentials = false"
            );
            resolve();
          }
        );
      });

      cookies.set("__TEST_COOKIE__", cookieValue);
      await new Promise((resolve) => cookies.send(resolve));
      addIFrame('/child');
      addInAppBrowserLaunchButton();
    } else {
      await new Promise((resolve) => {
        HTTP.get(
          cookieTestPath,
          {
            params: {
              ___expectedCookies___,
            },
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
      cookies.set("__TEST_COOKIE__", cookieValue);
      addIFrame('/child');
    }
  }

  attachMsg(createListItem("all tests run!"));
};

const func = () => {
  if (document.readyState === "complete") {
    runTests().catch(console.error);
  } else {
    setTimeout(func, 10);
  }
};

if (isIosCordova) {
  Meteor._absoluteUrl = Meteor.absoluteUrl;
  Meteor.absoluteUrl = function (url, opts) {
    return window.WebviewProxy.convertProxyUrl(Meteor._absoluteUrl(url, opts));
  };
  Meteor.absoluteUrl.defaultOptions = Meteor._absoluteUrl.defaultOptions;
  document.addEventListener("deviceready", () => {
    func();
  });
} else if (isAndroidCordova) {
  document.addEventListener("deviceready", () => {
    func();
  });
} else {
  func();
}
