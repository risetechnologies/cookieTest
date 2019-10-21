import { Cookies } from "meteor/ostrio:cookies";

new Cookies({
  auto: true,
  allowQueryStringCookies: true,
  allowedCordovaOrigin: /http:\/\/localhost:12600/
});

WebApp.connectHandlers.use("/__cookie_reset", (req, res) => {
  const key = decodeURI(req.query.___removeCookie___);

  if (req.headers.origin) {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Set-Cookie", [
    `${key}=""; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  ]);

  res.writeHead(200);
  res.end();
});

WebApp.connectHandlers.use("/__cookie_match", (req, res) => {
  const query = decodeURI(req.query.___expectedCookies___);

  if (req.headers.origin) {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // make sure we use the stringified req.headers.cookie}in order to match undefined as a string
  if (`${req.headers.cookie}` === query) {
    console.log(`expected: ${query}`);
    console.log(`got: ${req.headers.cookie}`);
    console.log("PASS");
    res.writeHead(200);
  } else {
    console.error(`expected: ${query}`);
    console.error(`got: ${req.headers.cookie}`);
    console.log("FAIL");
    res.writeHead(500);
  }

  res.end();
});
