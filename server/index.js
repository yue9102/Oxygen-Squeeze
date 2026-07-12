export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      url.pathname = "/lili.html";
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }

    if (url.pathname === "/oxygen-squeeze-case-study" || url.pathname === "/oxygen-squeeze-case-study.html") {
      url.pathname = "/";
      return Response.redirect(url.toString(), 301);
    }

    if (env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Static asset service is unavailable.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
};
