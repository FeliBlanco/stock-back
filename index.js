const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const axios = require('axios')
const cheerio = require('cheerio');

const app = express();
app.use(cors());

app.get('/scrape2/:codigo', async (req, res) => {
    const tiemo1 = Date.now();
    const codigo = req.params.codigo;
    const url = `https://www.cindymayorista.com.ar/resultado-busqueda.htm?keywords=${codigo}`;
    const { data } = await axios.get(url);

    const $ = cheerio.load(data);

    const box = $('.col-xs-24.product-listing-item').first();
    
    const nombre = box.find('.product-box-title').text().trim();
    if(!nombre) return res.status(404).send("No encontrado")
        
    const codigo_producto = box.find('.product-box-model').text().trim().replace('Código', '').replaceAll(' ', '');
    const precio = box.find('.product-box-price .prices-reserved').text().trim();
    console.log(precio)
    const precio_int = Number(precio.replace(/[$.\s]/g, ""))
    const img = box.find('.product-box-media img').attr('src');

    console.log("TARDO: ", Date.now() - tiemo1)
    res.send({ nombre, precio: precio_int, img: `https://www.cindymayorista.com.ar/${img}`, codigo: codigo_producto })
})

app.get('/scrape/:codigo', async (req, res) => {
    console.log("BUSCANDO")
    const codigo = req.params.codigo;
    const tiemo1 = Date.now();
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

    await page.goto('https://www.cindymayorista.com.ar/resultado-busqueda.htm?keywords=920065%2F022', { waitUntil: 'domcontentloaded' });

    const data = await page.evaluate(() => {
        console.log("CHE")
        const lista = document.querySelector('.row.product-listing.product-listing-grid.grid-col-2.grid-col-ls-3');
        let nombre = ""
        let precio = 0;
        let img = ""
        if(lista) {
            const box = lista.querySelector('.col-xs-24.product-listing-item')
            if(box) {
                const product_box = box.querySelector('.product-box')
                if(product_box) {
                    const product_media = product_box.querySelector('.product-box-media')
                    if(product_media) {
                        const img_ = product_media.querySelector('img')
                        img = img_.src;
                    }
                    const product_body = product_box.querySelector('.product-box-body')
                    if(product_body) {
                        const title_ = product_body.querySelector('.product-box-title')
                        if(title_) {
                            nombre = title_.innerText;
                        }

                        const precio_ = product_body.querySelector('.product-box-price .row.col-price-container .col .prices-reserved .product-box-price.box-special.package-box')
                        if(precio_) {
                            precio = precio_.innerText;
                        }
                    }
                }
            }
        }
        return {
            nombre,
            precio,
            img
        }
    });

    await browser.close();
    console.log("TARDO: ", Date.now() - tiemo1)
    res.json({ data });
});

app.listen(3006, () => console.log('Servidor corriendo en puerto 3000'));