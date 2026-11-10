import express from "express";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

const app = express();

const login = "264190";

app.enable("strict routing");

app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,OPTIONS,DELETE"
  );
  res.set(
    "Access-Control-Allow-Headers",
    "Content-Type,Accept,ngrok-skip-browser-warning"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.path !== "/" && !req.path.endsWith("/")) {
    const url = new URL(req.originalUrl, "http://localhost");
    return res.redirect(
      308,
      url.pathname + "/" + url.search
    );
  }

  next();
});

app.get("/login/", (req, res) => {
  res.type("text/plain").send(login);
});

app.get("/test/", async (req, res) => {
  const address = req.query.URL;

  if (typeof address !== "string") {
    return res.status(400)
      .type("text/plain")
      .send("Missing URL");
  }

  let target;

  try {
    target = new URL(address);

    if (!["http:", "https:"].includes(target.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return res.status(400)
      .type("text/plain")
      .send("Invalid URL");
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true
    });

    const page = await browser.newPage();

    await page.goto(target.href, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    await page.waitForSelector("#bt", {
      timeout: 20000
    });

    await page.waitForSelector("#inp", {
      timeout: 20000
    });

    const previous = await page.$eval(
      "#inp",
      element => element.value
    );

    await page.click("#bt");

    await page.waitForFunction(
      oldValue => {
        const element = document.getElementById("inp");

        return element &&
          element.value !== oldValue &&
          element.value.trim() !== "";
      },
      { timeout: 15000 },
      previous
    );

    const result = await page.$eval(
      "#inp",
      element => element.value
    );

    res.type("text/plain").send(result);

  } catch (error) {
    res.status(500)
      .type("text/plain")
      .send("Browser error: " + error.message);

  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.all(/.*/, (req, res) => {
  res.type("text/plain").send(login);
});

app.listen(
  process.env.PORT || 3000,
  "0.0.0.0"
);
