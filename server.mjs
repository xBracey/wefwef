import express from "express";
import ViteExpress from "vite-express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

const PROXY_ENDPOINT = "/api";

app.use(
  PROXY_ENDPOINT,
  createProxyMiddleware({
    target:
      process.env.NODE_ENV === "production"
        ? "http://localhost:6851"
        : "https://feddit.uk",
    changeOrigin: true,
    onProxyReq: (clientReq, req) => {
      clientReq.setHeader(
        "user-agent",
        `(${req.hostname}, ${process.env.EMAIL || "hello@vger.app"})`
      );
      clientReq.removeHeader("cookie");

      // Fake it to get around Lemmy API connection issue
      clientReq.setHeader("origin", `https://feddit.uk`);

      // Hack to get around pictrs endpoint not allowing auth in pathname and/or body
      if (
        req.method === "POST" &&
        req.path === "pictrs/image" &&
        req.query?.auth
      ) {
        clientReq.setHeader("cookie", `jwt=${req.query.auth}`);
        delete req.query.auth;
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      res.removeHeader("cookie");
    },
  })
);

const PORT = process.env.PORT || 5173;

// Tell search engines about new site
app.use("*", (req, res, next) => {
  if (req.hostname === "wefwef.app") {
    res.setHeader(
      "Link",
      `<https://vger.app${
        req.originalUrl === "/" ? "" : req.originalUrl
      }>; rel="canonical"`
    );
  }

  next();
});

ViteExpress.listen(app, PORT, () =>
  // eslint-disable-next-line no-console
  console.log(`Server is on http://localhost:${PORT}`)
);
