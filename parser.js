const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const { randomDelay } = require("./utils/randomDelay");
const { SEARCH_PARAMS } = require("./constants");

const results = [];

// Функция парсинга
const scrapeOzon = async (url) => {
  // Создаём опции для Chrome
  let options = new chrome.Options();
  options.addArguments("--disable-geolocation"); // Отключение геолокации через IP

  let driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    await driver.sendDevToolsCommand("Emulation.setGeolocationOverride", {
      latitude: 47.22299, // Широта Ростова-на-Дону
      longitude: 39.724588, // Долгота Ростова-на-Дону
      accuracy: 50, // Точность в метрах
    });

    // Переход на сайт Ozon
    await driver.get(url);
    await driver.actions().move({ x: 10, y: 10 }).perform();
    await driver.sleep(randomDelay(1000, 3000));

    try {
      await driver.findElement(By.className("rb"))?.click();

      // Ожидание загрузки результатов
      await driver.wait(until.elementLocated(By.css(".j8s_23")), 30000);
      await driver.wait(until.elementLocated(By.css(".ea026-a4")), 30000);

      await driver
        .findElement(By.className("a7j_0 b2120-a0 b2120-b1"))
        ?.click();
      await driver.wait(
        until.elementLocated(By.css("[data-widget='addressEditSelector']")),
        30000
      );
      await driver
        .findElement(By.xpath("//button[.//span[text()='Курьером']]"))
        ?.click();
      await driver.wait(
        until.elementLocated(
          By.css('[data-tid="om-geo-location-control-icon"]')
        ),
        30000
      );
      await driver
        .findElement(By.css('[data-tid="om-geo-location-control"]'))
        ?.click();
      await driver.sleep(1000);
      await driver
        .findElement(By.xpath("//button[.//div[.//div[text()='Продолжить']]]"))
        ?.click();
      await driver.sleep(1000);
      await driver
        .findElement(
          By.xpath("//button[.//div[.//div[text()='Сохранить адрес']]]")
        )
        ?.click();
      await driver.sleep(2000);

      // Извлечение данных о товарах
      const products = await driver.findElements(By.css(".j8s_23"));

      for (const product of products) {
        const title = await product
          .findElement(By.className("tsBody500Medium"))
          .getText();
        const priceText = await product
          .findElement(By.className("tsHeadline500Medium"))
          .getText();
        const link = await product
          .findElement(By.css("a"))
          .getAttribute("href");
        const price = parseFloat(priceText.replace(/[^\d]/g, ""));

        results.push({ title, link, price });
      }
    } catch (e) {
      console.warn(`${new Date()}`, e.message);
    } finally {
      driver.close();
    }

    // Фильтрация товаров
    const filteredProducts = results.filter((product) => {
      const matchesKeywords = SEARCH_PARAMS.keywords.every((keyword) =>
        product.title.toLowerCase().includes(keyword.toLowerCase())
      );
      return matchesKeywords && product.price <= SEARCH_PARAMS.maxPrice;
    });
    results.length = 0;
    // Вывод результатов
    return filteredProducts;
  } catch (error) {
    console.error("Ошибка парсинга:", error);
  }
};

module.exports = {
  scrapeOzon,
};
