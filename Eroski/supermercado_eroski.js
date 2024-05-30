const { port, db } = require('./config'); // Importa la configuración del puerto y la base de datos desde un archivo de configuración
const axios = require('axios'); // Librería para realizar solicitudes HTTP
const express = require('express'); // Framework web para Node.js
const app = express(); // Inicialización de la aplicación Express
const cheerio = require('cheerio'); // Librería para analizar y manipular documentos HTML
const fs = require('fs');
const puppeteer = require('puppeteer');
// Configuración de axios para simular un navegador web
const axiosInstance = axios.create({
     // Cabeceras simulando un navegador web
    headers: {
    // Agente de usuario del navegador
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      // Tipos de contenido aceptados
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      // Codificaciones aceptadas
      'Accept-Encoding': 'gzip, deflate, br',
      // Idiomas aceptados
      'Accept-Language': 'en-US,en;q=0.9',
      // Preferencia de no rastreo
      'DNT': '1',
      // Mantener la conexión activa
      'Connection': 'keep-alive',
      // Indica al servidor que la conexión puede actualizarse a HTTPS
      'Upgrade-Insecure-Requests': '1',
    },
  });

  async function autoScroll(page) {
    return await page.evaluate(async () => {
        return await new Promise((resolve, reject) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve(scrollHeight);
                }
            }, 100);
        });
    });
}


async function buscarEnEroski(terminos,categoria, subcategoria) {
    try {
        let resultadosTotales = [];

    
            console.log(`Buscando término en Eroski: ${terminos}`);
            // const terminoCodificado = encodeURIComponent(terminos);
            const url = terminos;

            const browser = await puppeteer.launch({ headless: "new" });
            const page = await browser.newPage();
            await page.goto(url);
            let previousHeight;
            let currentHeight = 0;

            // Hacer scroll hasta que no haya más resultados cargados
            while (previousHeight !== currentHeight) {
                previousHeight = currentHeight;
                currentHeight = await autoScroll(page);
                await new Promise(resolve => setTimeout(resolve, 4000)); // Esperar un segundo entre scrolls para evitar cargas excesivas
            }

            // Obtener el HTML de la página después de hacer scroll
            const html = await page.content();

            // Utiliza cheerio para analizar el HTML y extraer la información relevante
            const $ = cheerio.load(html);



            // Obtener los elementos de descripción del producto
            const productElements = $('.product-description');

            // Almacenar los resultados aquí
            const resultados = [];
                // Obtener el elemento <a> con la clase "available-btn" dentro del div con clase "add-product-btn"
             const categoria=$('.m__breadcrumb__path').find('.breadcrumblink').eq(0).text().trim();
             const subcategoria=$('.m__breadcrumb__path').find('.breadcrumblink').eq(1).text().trim();
             const ultCategoria= $('.product-lineal-title').text();
            // Iterar sobre cada elemento de producto
            

            productElements.each((index, element) => {

                const nombre = $(element).find('.product-title').text().trim().split('\n')[0];
                const tieneOferta = $(element).find('.price-before').text().trim().length > 0;
                const marca = "";
                const numero = 0;
               
                const l1Categoria = categoria;
                const l2Categoria = subcategoria;
                const l3Categoria =  ultCategoria;

                let precioNormal = '';
                let precioOferta = '';

                if (tieneOferta) {
                    // Producto en oferta
                    precioNormal =$(element).find('.price-offer-now').text().trim();
                    precioOferta =  $(element).find('.price-offer-before').text().trim();
                } else {
                    // Producto sin oferta
                    precioNormal = $(element).find('.price-now').text().trim();
                    precioOferta = '0.0';
                }

                // Remover el símbolo € y reemplazar la coma por punto para tener un formato numérico válido
                precioNormal = precioNormal.replace('€', '').replace(',', '.');
                precioOferta = precioOferta.replace('€', '').replace(',', '.');

                // Eliminar el texto "Ahora" del precio normal si está presente
                precioNormal = precioNormal.replace('Ahora', '').trim();

           

                // Buscar el elemento .slick-track dentro del contenedor
              // Buscar el elemento .slick-track dentro del contenedor
              // Buscar el elemento .slick-track dentro del contenedor
                
             // Obtener el elemento de la imagen del producto
             let imagen = '';
             const carruselElement = $(element).find('.product-slider.slick-initialized');
             if (carruselElement.length > 0) {
                 // Si hay un carrusel, buscar la primera imagen dentro del carrusel
                 const imagenElement = carruselElement.find('.slick-slide:not(.slick-cloned)').first().find('img');
                 if (imagenElement.length > 0) {
                     // Si se encuentra la primera imagen dentro del carrusel, obtener su src
                     imagen = imagenElement.attr('src');
                 }
             } else {
                 // Si no hay carrusel, obtener la imagen directamente
                 imagen = $(element).find('.product-img').attr('src');
             }
             console.log(imagen)
             const matchesWithUnderscore = imagen.match(/\/(\d+)_\d+\.jpg$/);
             const matchesWithoutUnderscore = imagen.match(/\/(\d+)\.jpg$/);
             
             if (matchesWithUnderscore) {
                 // Si la URL tiene el formato con "_1.jpg"
                 idProducto = matchesWithUnderscore[1];
             } else if (matchesWithoutUnderscore) {
                 // Si la URL tiene el formato sin "_1.jpg"
                 idProducto = matchesWithoutUnderscore[1];
             }

                

                resultados.push({ nombre, precioNormal, precioOferta, supermercado: 'Eroski', imagen, marca, idProducto, l1Categoria,l2Categoria,l3Categoria });
            });

            resultadosTotales = resultadosTotales.concat(resultados);

          

            await browser.close();
        
        console.log(`Terminó de buscar el término en Eroski: ${terminos}`);
        return resultadosTotales;
    } catch (error) {
        console.error(error);
        throw new Error('Error en la búsqueda en Eroski');
    }
}

const terminos=[
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059988-aceite-vinagre-sal-harina-y-pan-rallado/2059992-aceite-de-girasol/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059988-aceite-vinagre-sal-harina-y-pan-rallado/2059991-aceite-de-oliva-intenso/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059988-aceite-vinagre-sal-harina-y-pan-rallado/2059990-aceite-de-oliva-suave/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059988-aceite-vinagre-sal-harina-y-pan-rallado/2059989-aceite-de-oliva-virgen/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059988-aceite-vinagre-sal-harina-y-pan-rallado/2059993-otros-aceites/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059988-aceite-vinagre-sal-harina-y-pan-rallado/2059998-harina/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059988-aceite-vinagre-sal-harina-y-pan-rallado/2059999-pan-rallado/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059988-aceite-vinagre-sal-harina-y-pan-rallado/2060000-pastillas-caldo/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059988-aceite-vinagre-sal-harina-y-pan-rallado/2059996-sal/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059988-aceite-vinagre-sal-harina-y-pan-rallado/2059994-vinagres-especiales/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059988-aceite-vinagre-sal-harina-y-pan-rallado/2059995-vinagre/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060067-aceitunas-y-encurtidos/2060071-aceitunas-especiales/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060067-aceitunas-y-encurtidos/2060070-aceitunas-negras/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060067-aceitunas-y-encurtidos/2060068-aceitunas-rellenas/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060067-aceitunas-y-encurtidos/2060069-aceitunas-verdes/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060067-aceitunas-y-encurtidos/2060073-banderillas-y-cocktail/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060067-aceitunas-y-encurtidos/2060074-guindillas-alcaparras-y-otros/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060067-aceitunas-y-encurtidos/2060072-pepinillos-y-cebolletas/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060067-aceitunas-y-encurtidos/2060075-otros-encurtidos-tradicionales/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060015-conservas-de-pescado/2060025-almejas-navajas-y-otros/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060015-conservas-de-pescado/2060016-atun-aceite/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060015-conservas-de-pescado/2060019-atun-y-bonito-escabeche/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060015-conservas-de-pescado/2060018-atun-y-bonito-natural/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060015-conservas-de-pescado/2060017-bonito-aceite/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060015-conservas-de-pescado/2060020-ventresca-de-bonito-y-atun/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060015-conservas-de-pescado/2060024-berberechos/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060015-conservas-de-pescado/2060027-caballa/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060015-conservas-de-pescado/2060026-calamar-pulpo-y-chipiron/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060015-conservas-de-pescado/2060022-mejillon/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060015-conservas-de-pescado/2060023-sardina-y-sardinilla/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060015-conservas-de-pescado/2060028-otras-conservas/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060015-conservas-de-pescado/2060025-almejas-navajas-y-otros/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060001-conservas-vegetales/2060011-champinones-y-setas/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060001-conservas-vegetales/2060014-conservas-fruta/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060001-conservas-vegetales/2060006-esparragos/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060001-conservas-vegetales/2060010-espinacas-acelgas-y-otros/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060001-conservas-vegetales/2060008-guisantes-y-maiz/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060001-conservas-vegetales/2060005-pimientos-rojos-otros/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060001-conservas-vegetales/2060004-pimientos-rojos-piquillo/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060001-conservas-vegetales/2060002-tomate-frito/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060001-conservas-vegetales/2060003-tomate-natural/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060001-conservas-vegetales/2060012-vegetales-ensalada/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060001-conservas-vegetales/2060009-alcachofas-y-menestras/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060076-frutos-secos-patatas-y-snacks/2060080-cacahuetesmaiz-y-coktail/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060076-frutos-secos-patatas-y-snacks/2060083-frutas-desecadas/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060076-frutos-secos-patatas-y-snacks/2060082-nueces-y-otros-frutos-secos/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060076-frutos-secos-patatas-y-snacks/2060092-patatas-de-tubo/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060076-frutos-secos-patatas-y-snacks/2060089-patatas-light/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060076-frutos-secos-patatas-y-snacks/2060091-patatas-lisas-sabor/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060076-frutos-secos-patatas-y-snacks/2060088-patatas-lisas-tradicionales/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060076-frutos-secos-patatas-y-snacks/2060093-patatas-onduladas-sabores/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060076-frutos-secos-patatas-y-snacks/2060090-patatas-onduladas-tradicionales/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060076-frutos-secos-patatas-y-snacks/2060077-pipas/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060076-frutos-secos-patatas-y-snacks/2060079-pistachos-y-anacardos/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060076-frutos-secos-patatas-y-snacks/2060094-snack-y-otros-aperitivos/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059807-leche-batidos-y-bebidas-vegetales/2059811-leche-calcio/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059807-leche-batidos-y-bebidas-vegetales/2059813-leche-fresca/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059807-leche-batidos-y-bebidas-vegetales/2059817-leche-condensada/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059807-leche-batidos-y-bebidas-vegetales/2059809-leche-desnatada/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059807-leche-batidos-y-bebidas-vegetales/2059816-leche-en-polvo/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059807-leche-batidos-y-bebidas-vegetales/2059810-leche-entera/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059807-leche-batidos-y-bebidas-vegetales/2059808-leche-semidesnatada/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059807-leche-batidos-y-bebidas-vegetales/2059815-leche-sin-lactosa-y-especiales/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059807-leche-batidos-y-bebidas-vegetales/2059843-batido-de-cacao-y-chocolate-liquido/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059807-leche-batidos-y-bebidas-vegetales/2059814-bebida-de-soja-y-otros-cereales/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059807-leche-batidos-y-bebidas-vegetales/2059847-horchata/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059807-leche-batidos-y-bebidas-vegetales/2059849-lactozumo/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059807-leche-batidos-y-bebidas-vegetales/2059846-otros-batidos/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060029-legumbres-arroz-y-pasta/2060032-arroz/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060029-legumbres-arroz-y-pasta/23061098-pasta-gourmet/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060029-legumbres-arroz-y-pasta/2060033-espagueti-tallarines-y-pasta-larga/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060029-legumbres-arroz-y-pasta/2060036-fideos-y-pasta-sopa/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060029-legumbres-arroz-y-pasta/2060037-lasana-y-canelones/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060029-legumbres-arroz-y-pasta/2060030-legumbres/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060029-legumbres-arroz-y-pasta/2060031-legumbres-cocidas/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060029-legumbres-arroz-y-pasta/2060034-macarrones-y-pasta-corta/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060029-legumbres-arroz-y-pasta/2060039-pasta-al-huevo-y-nidos/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060029-legumbres-arroz-y-pasta/2060851-pasta-sin-gluten-e-integral/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060029-legumbres-arroz-y-pasta/2060035-pasta-vegetal-y-ensaladas/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060029-legumbres-arroz-y-pasta/4000101-salsas-/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060029-legumbres-arroz-y-pasta/2060040-semolas--tapioca-y-otras/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060029-legumbres-arroz-y-pasta/2060038-tortelinis-raviolis-y-otras/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059851-mantequilla-nata-y-cremas/2059857-bechamel/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059851-mantequilla-nata-y-cremas/2059856-nata-fresca/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059851-mantequilla-nata-y-cremas/2059854-nata-para-cocinar/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059851-mantequilla-nata-y-cremas/2059852-mantequilla/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059851-mantequilla-nata-y-cremas/2059853-margarina/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059851-mantequilla-nata-y-cremas/2059855-nata-de-reposteria/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060042-platos-preparados/2060049-carne-ave-y-caza/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060042-platos-preparados/2060048-pescado/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060042-platos-preparados/2060047-verduras-y-pimientos-rellenos/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060042-platos-preparados/2060051-comida-mejicana/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060042-platos-preparados/2060055-comida-otros-origenes/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060042-platos-preparados/2060046-ensaladas--preparadas/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060042-platos-preparados/2060044-legumbres-arroz-y-pasta/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060042-platos-preparados/2060045-pure-de-patatas/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060042-platos-preparados/2060050-salchichas-y-magros/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060042-platos-preparados/2060043-sopas-caldos-y-cremas/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059831-postres-lacteos-/2059835-arroz-con-leche-/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059831-postres-lacteos-/2059840-gelatinas/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059831-postres-lacteos-/2059841-sin-frio/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059831-postres-lacteos-/5000301-cafes-y-bebidas-frias/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059831-postres-lacteos-/2059837-copas-con-nata-y-mousses/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059831-postres-lacteos-/2059834-cuajada/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059831-postres-lacteos-/2059833-flan/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059831-postres-lacteos-/2059832-natillas/`},
    {termino:`https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059831-postres-lacteos-/2059838-postres-de-chocolate-y-otros/`},
    {termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059831-postres-lacteos-/2059841-sin-frio/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000365-productos-de-dietetica/5000382-alimentacion-deportiva/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000365-productos-de-dietetica/5000379-bebidas-vegetales/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000365-productos-de-dietetica/5000380-fitoterapia/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000365-productos-de-dietetica/5000381-nutricion-y-dietetica/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000365-productos-de-dietetica/5000385-productos-de-dietetica-sin-gluten/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000365-productos-de-dietetica/5000386-tortitas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000365-productos-de-dietetica/5000387-superalimentos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000364-productos-ecologicos/5000368-aceites-y-condimentos-eco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000364-productos-ecologicos/5000369-aperitivos-olivas-y-encurtidos-eco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000364-productos-ecologicos/5000370-arroces-semillas-y-legumbres-eco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000364-productos-ecologicos/5000376-bebidas-eco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000364-productos-ecologicos/5000373-conservas-eco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000364-productos-ecologicos/5000372-desayunos-y-meriendas-eco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000364-productos-ecologicos/5000371-dulces-y-edulcorantes-eco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000364-productos-ecologicos/5000375-leche-y-bebidas-vegetales-eco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000364-productos-ecologicos/5000374-pastassopas-y-cremas-eco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/5000364-productos-ecologicos/5000389-refrigerados/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060056-salsas-y-especias/2060065-perejil-y-oregano/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060056-salsas-y-especias/2060064-azafran-y-colorante/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060056-salsas-y-especias/2060066-otras-especias/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060056-salsas-y-especias/2060058-ketchup-y-mostaza/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060056-salsas-y-especias/2060057-mayonesa/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060056-salsas-y-especias/2060059-salsa-de-soja-picantes-y-otras/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060056-salsas-y-especias/2060063-salsas-para-carne/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060056-salsas-y-especias/2060060-salsas-para-pasta/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060056-salsas-y-especias/2060061-salsa-rosa-brava-y-barbacoa/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2060056-salsas-y-especias/2060062-otras-salsas-frias/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059818-yogures/2059827-lcasei-y-probioticos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059818-yogures/2059829-salud-y-estetica/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059818-yogures/2059828-petit-y-otros-infantiles/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059818-yogures/2059824-yogur-bifidus/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059818-yogures/2059825-yogur-bifidus-0/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059818-yogures/2059821-yogur-cremoso/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059818-yogures/2059820-yogur-de-frutas-y-sabores/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059818-yogures/2059823-yogur-desnatado/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059818-yogures/2059822-yogur-ecologico-y-especiales/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059818-yogures/2059826-yogur-liquido-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059818-yogures/2059819-yogur-natural/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/2059818-yogures/2059830-yogur-soja-y-100-vegetal/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/4000017-comida-internacional/4000018-comida-mexicana/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/4000017-comida-internacional/4000019-comida-oriental/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059806-alimentacion/4000017-comida-internacional/4000020-otros-origenes/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059746-carnes-y-aves/2059757-adobados/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059746-carnes-y-aves/2059748-anojo-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059746-carnes-y-aves/2059755-carne-picada-y-hamburguesas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059746-carnes-y-aves/2059750-cerdo-y-cerdo-iberico/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059746-carnes-y-aves/2059752-conejo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059746-carnes-y-aves/2059751-cordero-y-cochinillo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059746-carnes-y-aves/2059758-elaborados-y-empanados/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059746-carnes-y-aves/2059754-pavo-pato-y-otras-aves/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059746-carnes-y-aves/2059753-pollo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059746-carnes-y-aves/2059756-salchicha-morcilla-y-chorizo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059746-carnes-y-aves/2059747-ternera/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059746-carnes-y-aves/2059749-vaca-buey-y-toro/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059746-carnes-y-aves/2059759-otras-carnes-y-casqueria/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059880-curados-y-embutidos/2059888-chistorra-y-longaniza/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059880-curados-y-embutidos/2059883-chorizo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059880-curados-y-embutidos/2059890-embutidos-preparados/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059880-curados-y-embutidos/2059881-jamon-curado/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059880-curados-y-embutidos/2059882-jamon-curado-pieza/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059880-curados-y-embutidos/2059884-lomo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059880-curados-y-embutidos/2059887-panceta-y-morcilla/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059880-curados-y-embutidos/2059892-pavo-y-otras-aves-curados/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059880-curados-y-embutidos/2059886-salami-y-sobrasada/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059880-curados-y-embutidos/2059885-salchichon-y-fuet/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059880-curados-y-embutidos/2060865-taquitos-curados/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059880-curados-y-embutidos/2059893-otros-curados-y-embutidos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059872-fiambres-y-cocidos/2059875-bacon/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059872-fiambres-y-cocidos/2059877-cabeza-de-cerdo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059872-fiambres-y-cocidos/2059878-fiambres-de-cerdo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059872-fiambres-y-cocidos/2059873-jamon-cocido/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059872-fiambres-y-cocidos/2059874-pavo-y-otras-aves-fiambres/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059872-fiambres-y-cocidos/2060854-taquitos-cocidos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059872-fiambres-y-cocidos/2059879-otros-fiambres-y-cocidos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059699-frutas/2059706-ciruelas-y-uvas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059699-frutas/2059704-fresas-cerezas-y-frutos-rojos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059699-frutas/2061023-fruta-ecologica/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059699-frutas/2059709-fruta-partida-y-zumos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059699-frutas/5000105-frutos-secos-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059699-frutas/2059701-manzanas-y-peras/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059699-frutas/2059705-melon-y-sandia/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059699-frutas/2059700-naranjas-y-otros-citricos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059699-frutas/2059703-pina-aguacate-mango-y-papaya/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059699-frutas/2059702-platanos-y-kiwis/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059699-frutas/2059708-yuca-coco-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059760-huevos/2059766-huevos-camperos-y-ecologicos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059760-huevos/2059767-huevos-de-codorniz/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059760-huevos/2059762-huevos-talla-m/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059760-huevos/2059763-huevos-talla-l/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059760-huevos/2059764-huevos-talla-xl/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059760-huevos/2059768-ovoproductos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059894-ibericos/2059897-chorizo-iberico/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059894-ibericos/2059895-jamon-iberico/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059894-ibericos/2059896-jamon-iberico-pieza/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059894-ibericos/2059898-lomo-iberico/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059894-ibericos/2059899-salchichon-iberico/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059894-ibericos/2059900-otros-ibericos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059736-mariscos/2059740-almeja-mejillon-vieira-y-navaja/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059736-mariscos/2059743-bigaros-cangrejos-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059736-mariscos/2059741-buey-centollo-y-necora/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059736-mariscos/2059739-gambas-y-cigalas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059736-mariscos/2059737-langostino-cocido/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059736-mariscos/2059738-langostino-crudo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059736-mariscos/2059744-percebes-y-ostras/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059783-panaderia-y-pasteleria/2059785-pan-blanco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059783-panaderia-y-pasteleria/2059786-pan-tradicional/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059783-panaderia-y-pasteleria/2059787-pan-integral-cereales-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059783-panaderia-y-pasteleria/2059791-burguer-de-molde-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059783-panaderia-y-pasteleria/2059795-pan-sin-gluten/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059783-panaderia-y-pasteleria/2059802-croissants-napolitanas-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059783-panaderia-y-pasteleria/2059803-hojaldres-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059783-panaderia-y-pasteleria/2059794-empanadas-y-bolleria-salada/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059783-panaderia-y-pasteleria/4000014-berlinas-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059783-panaderia-y-pasteleria/2059804-bizcochos-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059783-panaderia-y-pasteleria/4000015-magdalenas-y-rosquillas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059783-panaderia-y-pasteleria/4000016-pastas-de-te-y-volovanes/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059783-panaderia-y-pasteleria/2059800-pasteles-y-tartas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059722-pescados/2059734-ahumados-huevas-y-salazones/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059722-pescados/2059724-anchoa-sardina-chicharro-y-verdel/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059722-pescados/2059735-anchoas-y-boquerones-conserva/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059722-pescados/2059728-bonito-atun-y-pez-espada/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059722-pescados/2059731-calamar-sepia-y-pulpo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059722-pescados/2059729-congrio-y-rape/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059722-pescados/2059725-gallo-lenguadina-y-bacalao/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059722-pescados/2059733-gulas-y-surimi/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059722-pescados/2059723-merluza-lirio-y-pescadilla/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059722-pescados/2059726-lubina-dorada-rodaballo-y-besugo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059722-pescados/2059732-pescados-preparados-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059722-pescados/2059727-salmon-y-trucha/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059769-platos-preparados/5000145-calentar-y-listo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059769-platos-preparados/5000146-disfruta-cocinando/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059769-platos-preparados/5000144-listo-para-comer/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059769-platos-preparados/4000012-pizza/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059769-platos-preparados/4000011-sushi/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059858-queso-y-membrillo/2059867-infantiles-y-porciones/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059858-queso-y-membrillo/2059865-queso-azul/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059858-queso-y-membrillo/2059862-queso-curado-y-viejo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059858-queso-y-membrillo/2059859-queso-fresco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059858-queso-y-membrillo/2059863-queso-lonchas-y-fundidos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059858-queso-y-membrillo/2059861-queso-semicurado-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059858-queso-y-membrillo/2059860-queso-tierno/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059858-queso-y-membrillo/2059864-quesos-internacionales/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059858-queso-y-membrillo/2059868-queso-tarrina/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059858-queso-y-membrillo/2059869-queso-rallado/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059858-queso-y-membrillo/2059870-tablas-de-queso-y-tartas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059858-queso-y-membrillo/2059871-membrillo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059901-salchichas-pates-y-foie/2059913-cremas-sobrasadas-y-mantecas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059901-salchichas-pates-y-foie/2059916-foie-gras-y-pates/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059901-salchichas-pates-y-foie/2059911-pate-de-cerdo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059901-salchichas-pates-y-foie/2059910-pate-de-pato-y-oca/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059901-salchichas-pates-y-foie/2060964-pate-ecologico/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059901-salchichas-pates-y-foie/2059915-pate-de-pescado-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059901-salchichas-pates-y-foie/2059914-pates-gourmet/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059901-salchichas-pates-y-foie/2059906-salchichas-blancas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059901-salchichas-pates-y-foie/2059902-salchichas-frankfurt/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059901-salchichas-pates-y-foie/2059907-salchichas-gruesas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059901-salchichas-pates-y-foie/2059904-salchichas-pollo-y-pavo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059901-salchichas-pates-y-foie/2059905-salchichas-queso/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059901-salchichas-pates-y-foie/2059903-salchichas-viena/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059710-verduras-y-hortalizas/2059719-acelgas-espinacas-y-otras/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059710-verduras-y-hortalizas/2059712-ajos-y-cebollas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059710-verduras-y-hortalizas/2059717-berenjena-calabaza-y-calabacin/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059710-verduras-y-hortalizas/2059715-ensaladas-listas-para-consumir/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059710-verduras-y-hortalizas/2059718-hongos-setas-y-champinones/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059710-verduras-y-hortalizas/2061024-hortaliza-ecologica/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059710-verduras-y-hortalizas/2059716-lechuga-pepino-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059710-verduras-y-hortalizas/2059711-patatas-y-zanahorias/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059710-verduras-y-hortalizas/2059720-preparados-y-precocinados/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059710-verduras-y-hortalizas/2059713-puerros-judias-legumbres-y-repollos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059710-verduras-y-hortalizas/2059721-salsas-hierbas-y-especias/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2059698-frescos/2059710-verduras-y-hortalizas/2059714-tomates-y-pimientos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060119-la-tienda-del-cafe/2060124-achicoria-y-cereales-solubles/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060119-la-tienda-del-cafe/2060122-cafe-capsulas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060119-la-tienda-del-cafe/2060123-cafe-grano/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060119-la-tienda-del-cafe/2060120-cafe-molido/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060119-la-tienda-del-cafe/2060121-cafe-soluble/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060182-azucar-y-edulcorante/5000290-adornos-reposteria/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060182-azucar-y-edulcorante/2060965-azucar-ecologico/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060182-azucar-y-edulcorante/2060185-azucar-especial/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060182-azucar-y-edulcorante/2060186-azucarillos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060182-azucar-y-edulcorante/2060184-azucar-moreno/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060182-azucar-y-edulcorante/2060183-azucar-paquete/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060182-azucar-y-edulcorante/5000294-crema-catalana-y-otras-cremas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060182-azucar-y-edulcorante/2060187-edulcorante-y-fructosa/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060182-azucar-y-edulcorante/5000293-flanes-natillas-y-cuajadas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060182-azucar-y-edulcorante/5000288-gelatinas-reposteria/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060182-azucar-y-edulcorante/5000287-levaduras-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060182-azucar-y-edulcorante/5000291-pasteles-tartas-y-bizcochos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060182-azucar-y-edulcorante/5000289-sirope-y-caramelo-liquido/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060162-bolleria/2060167-bizcocho-mantecada-y-ensaimadas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060162-bolleria/2060863-bolleria-sin-gluten/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060162-bolleria/2060168-canas-palmeras-y-napolitanas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060162-bolleria/2060166-croissants-bolleria/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060162-bolleria/2060165-magdalenas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060162-bolleria/2060164-pan-de-leche/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060162-bolleria/2060163-sobaos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060162-bolleria/2060170-tartas-y-pasteles/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060162-bolleria/2060172-otros-bolleria/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060129-cacao-en-polvo-y-crema-de-cacao/4000013-cacao-instantaneo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060129-cacao-en-polvo-y-crema-de-cacao/2060130-cacao-soluble/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060129-cacao-en-polvo-y-crema-de-cacao/2060134-chocolate-a-la-taza-en-polvo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060129-cacao-en-polvo-y-crema-de-cacao/2060131-cremas-de-cacao-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060129-cacao-en-polvo-y-crema-de-cacao/2060133-snack-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060202-caramelos-chicles-y-golosinas/2060208-regalices-gomas-y-otros/#'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060202-caramelos-chicles-y-golosinas/2060206-caramelos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060202-caramelos-chicles-y-golosinas/2060203-chicles/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060202-caramelos-chicles-y-golosinas/2060207-chupa-chups/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060202-caramelos-chicles-y-golosinas/2060209-grajeas-y-bombones-de-chocolate/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060202-caramelos-chicles-y-golosinas/2060210-golosinas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/5000189-cereales-y-barritas/2060145-barritas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/5000189-cereales-y-barritas/2060148-cereales-fibra-linea-y-muesli/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/5000189-cereales-y-barritas/2060147-cereales-infantiles/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/5000189-cereales-y-barritas/2060146-cornflakes/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060190-chocolates-y-bombones/2060200-bombones/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060190-chocolates-y-bombones/2060199-chocolate-a-la-taza/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060190-chocolates-y-bombones/2060191-chocolate-con-leche/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060190-chocolates-y-bombones/2060192-chocolate-con-leche-y-frutos-secos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060190-chocolates-y-bombones/2060197-chocolate-infantil/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060190-chocolates-y-bombones/2060193-chocolate-negro/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060190-chocolates-y-bombones/2060194-chocolate-negro-con-frutos-secos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060190-chocolates-y-bombones/2060201-chocolate-para-postres/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060190-chocolates-y-bombones/2060196-chocolate-sin-azucar/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060190-chocolates-y-bombones/2060195-chocolates-rellenos-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060190-chocolates-y-bombones/2060198-merienda-chocolate/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060135-galletas/2060142-galletas-aperitivos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060135-galletas/2060136-galletas-clasicas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060135-galletas/2060138-galletas-desayuno-infantil/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060135-galletas/2060139-galletas-fibra-integrales-y-ecologicas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060135-galletas/2060141-galletas-rellenas-y-cubiertas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060135-galletas/2060143-galletas-sin-gluten/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060135-galletas/2060137-galletas-snack-surtidas-y-pastas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/4000095-infusiones/2060128-infusiones-saludables/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/4000095-infusiones/2060126-manzanilla/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/4000095-infusiones/2060125-te/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/4000095-infusiones/2060127-tila-y-poleo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060173-miel-y-mermelada/2060175-fresa-y-ciruela/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060173-miel-y-mermelada/2060174-melocoton-y-albaricoque/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060173-miel-y-mermelada/2060177-mermelada-porciones/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060173-miel-y-mermelada/2060176-mermeladas-ligeras/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060173-miel-y-mermelada/2060178-otras-mermeladas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060173-miel-y-mermelada/2060179-miel-milflores/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060173-miel-y-mermelada/2060180-miel-monoflores/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060173-miel-y-mermelada/2060181-otras-mieles/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060149-pan-de-molde-y-tostado/2060159-biscottes-picatostes-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060149-pan-de-molde-y-tostado/2060160-minibiscottes-y-panecillos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060149-pan-de-molde-y-tostado/2060157-pan-burguer-hot-dogs-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060149-pan-de-molde-y-tostado/2060152-pan-de-molde-con-corteza/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060149-pan-de-molde-y-tostado/2060153-pan-de-molde-con-corteza-rustica/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060149-pan-de-molde-y-tostado/2060154-pan-de-molde-integral/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060149-pan-de-molde-y-tostado/2060155-pan-de-molde-integral-sin-corteza/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060149-pan-de-molde-y-tostado/2060150-pan-de-molde-sin-corteza/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060149-pan-de-molde-y-tostado/2060158-pan-tostado/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/2060149-pan-de-molde-y-tostado/2060161-tostas-y-crackers/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/5000302-productos-ecologicos/5000305-desayunos-y-meriendas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060118-dulces-y-desayuno/5000302-productos-ecologicos/5000303-dulces-y-edulcorantes/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060212-agua/2060218-agua-con-sabores/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060212-agua/2060214-agua-de-1-litro-a-2-litros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060212-agua/2060213-agua-hasta-1-litro/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060212-agua/2060215-agua-mas-de-2-litros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060212-agua/2060216-con-gas-mas-de-1-litro/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060212-agua/2060217-con-gas-menos-de-1-litro/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060304-cavachampan-y-sidra/2060305-cava-brut-nature/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060304-cavachampan-y-sidra/2060310-cava-rosado/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060304-cavachampan-y-sidra/2060309-cava-medianos-y-minis/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060304-cavachampan-y-sidra/2060308-cava-seco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060304-cavachampan-y-sidra/2060307-cava-semi-seco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060304-cavachampan-y-sidra/2060311-otros-cavas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060304-cavachampan-y-sidra/2060314-champagne/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060304-cavachampan-y-sidra/2060313-sidra-achampanada/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060304-cavachampan-y-sidra/2060312-sidra-natural/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060233-cervezas/4000001-00/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060233-cervezas/4000002-extra/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060233-cervezas/4000000-lager/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060233-cervezas/4000004-premium/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060233-cervezas/4000003-sabores/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060294-finos-dulces-y-aperitivos/2060297-fino/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060294-finos-dulces-y-aperitivos/2060299-moscatel/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060294-finos-dulces-y-aperitivos/2060295-mosto/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060294-finos-dulces-y-aperitivos/2060296-vermouth/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060294-finos-dulces-y-aperitivos/2060298--vino-manzanilla/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060294-finos-dulces-y-aperitivos/2060303-otros-vinos-dulces/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060315-licor/2060324-anis/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060315-licor/2060326-cocktail-y-combinados/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060315-licor/2060321-cognac-y-brandy/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060315-licor/2060317-ginebra/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060315-licor/2060319-licor-fruta-con-alcohol/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060315-licor/2060325-licor-frutas-sin-alcohol/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060315-licor/2060320-orujo-y-aguardiente/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060315-licor/2060322-pacharan-y-ponche/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060315-licor/2060318-ron/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060315-licor/2060323-vodka-y-tequila/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060315-licor/2060316-whisky/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/5000308-productos-ecologicos/5000359-bebidas-eco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060219-refrescos/2060228-bebidas-energeticas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060219-refrescos/2060226-bebidas-isotonicas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060219-refrescos/2060221-cola-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060219-refrescos/2060223-limon-con-gas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060219-refrescos/2060222-naranja-con-gas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060219-refrescos/2060225-otros-con-gas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060219-refrescos/2060230-limon-sin-gas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060219-refrescos/2060229-naranja-sin-gas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060219-refrescos/2060232-otros-sin-gas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060219-refrescos/2060227-refrescos-de-te/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060219-refrescos/2060224-tonicas-bitter-y-gaseosas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060266-vinos-blancos/2060274-do-navarra-blanco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060266-vinos-blancos/2060268-do-penedes-blanco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060266-vinos-blancos/2060269-do-rias-baixas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060266-vinos-blancos/2060275-do-ribeiro/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060266-vinos-blancos/2060271-do-rioja-blanco-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060266-vinos-blancos/2060267-do-rueda/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060266-vinos-blancos/2060272-do-txakoli/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060266-vinos-blancos/2060276-do-valdepenas-blanco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060266-vinos-blancos/2060277-otros-vinos-blancos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060289-vinos-de-mesa-y-sangrias/2060290-vino-brik/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060289-vinos-de-mesa-y-sangrias/2060291-vino-cristal/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060289-vinos-de-mesa-y-sangrias/2060293-vino-garrafa/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060289-vinos-de-mesa-y-sangrias/2060292-sangrias-y-tinto-de-verano/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060278-vinos-rosados/2060279-do-navarra-rosado/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060278-vinos-rosados/2060284-do-penedes-rosado/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060278-vinos-rosados/2060282-do-rioja-rosado/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060278-vinos-rosados/2060285-do-valdepenas-rosado/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060278-vinos-rosados/2060288-otros-vinos-rosados/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060252-vinos-tintos/2060261-do-jumilla/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060252-vinos-tintos/2060260-do-la-mancha/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060252-vinos-tintos/2060257-do-navarra-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060252-vinos-tintos/2060258-do-ribera-de-duero-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060252-vinos-tintos/2060254-do-rioja-crianza/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060252-vinos-tintos/2060253-do-rioja-joven/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060252-vinos-tintos/2060255-do-rioja-reserva/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060252-vinos-tintos/2060262-do-somontano/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060252-vinos-tintos/2060263-do-toro/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060252-vinos-tintos/2060259-do-valdepenas-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060252-vinos-tintos/2060264-vinos-de-la-tierra-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060252-vinos-tintos/2060265-otros-vinos-tintos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060243-zumos-y-nectar/4000007-funcionales/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060243-zumos-y-nectar/4000008-to-go/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060243-zumos-y-nectar/4000010-zumos-refrigerados/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060211-bebidas/2060243-zumos-y-nectar/4000006-zumos-y-nectares/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060433-afeitado-y-depilacion/2060438-afeitado-espuma-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060433-afeitado-y-depilacion/2060435-afeitado-maquinillas-de-recambios/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060433-afeitado-y-depilacion/2060434-afeitado-maquinillas-desechables/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060433-afeitado-y-depilacion/2060436-afeitado-recambios/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060433-afeitado-y-depilacion/2060439-aftershave-balsamo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060433-afeitado-y-depilacion/2060440-aftershave-gel-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060433-afeitado-y-depilacion/2060443-depilacion-cera-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060433-afeitado-y-depilacion/2060441-depilacion-crema-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060433-afeitado-y-depilacion/2060445-depilacion-especifica-hombre/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060433-afeitado-y-depilacion/2060442-depilacion-maquinilla-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060433-afeitado-y-depilacion/2060444-depilacion-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060426-coloracion-cabello/2060850-masculina/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060426-coloracion-cabello/5000182-no-permanente/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060426-coloracion-cabello/5000180-permanente/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060426-coloracion-cabello/5000184-permanente-sin-amoniaco/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060426-coloracion-cabello/5000185-retoca-raices/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060426-coloracion-cabello/5000181-semipermanente/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060426-coloracion-cabello/5000183-otros-usos-coloracion/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060456-cuidado-corporal/2060466-anticeluliticos-y-otros-tratamientos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060456-cuidado-corporal/2060462-body-milk-y-aceites/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060456-cuidado-corporal/2060463-cremas-corporales/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060456-cuidado-corporal/2060457-gel-familiar/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060456-cuidado-corporal/2060458-gel-femenino/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060456-cuidado-corporal/2060460-gel-infantil/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060456-cuidado-corporal/2060459-gel-masculino/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060456-cuidado-corporal/2060461-gel-natural-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060456-cuidado-corporal/2060465-locion-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060402-cuidado-facial/2060408-base-maquillaje-colorete-corrector/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060402-cuidado-facial/2060406-cuidado-facial-femenino/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060402-cuidado-facial/2060407-cuidado-facial-masculino/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060402-cuidado-facial/2060403-discos-y-toallitas-desmaquilladoras/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060402-cuidado-facial/2060404-limpieza-facial-femenina/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060402-cuidado-facial/2060405-limpieza-facial-masculina/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060402-cuidado-facial/2060410-maquillaje-de-ojos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060402-cuidado-facial/2060409-maquillaje-y-cuidado-labios/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060402-cuidado-facial/2060411-neceser-sets-utiles-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060480-cuidado-pies-y-manos/2060484-cuidado-manos-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060480-cuidado-pies-y-manos/2060485-cuidado-pies/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060480-cuidado-pies-y-manos/2060483-cuidado-unas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060480-cuidado-pies-y-manos/2060481-jabon-tocador/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060480-cuidado-pies-y-manos/2060482-laca-unas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060480-cuidado-pies-y-manos/2060486-utiles-pies-y-manos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060468-desodorantes-y-colonias/2060469-colonia-familiar/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060468-desodorantes-y-colonias/2060471-colonia-femenina/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060468-desodorantes-y-colonias/2060470-colonia-infantil/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060468-desodorantes-y-colonias/2060472-colonia-masculina/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060468-desodorantes-y-colonias/2060473-desodorante-roll-on-femenino/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060468-desodorantes-y-colonias/2060474-desodorante-roll-on-masculino/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060468-desodorantes-y-colonias/2060476-desodorante-spray-femenino/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060468-desodorantes-y-colonias/2060477-desodorante-spray-masculino/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060468-desodorantes-y-colonias/2060479-desodorante-stick-crema-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060446-higiene-bucal/2060453-cepillo-electrico/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060446-higiene-bucal/2060452-cepillo-infantil/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060446-higiene-bucal/2060451-cepillo-manual/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060446-higiene-bucal/2060447-dentifrico-blanqueador-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060446-higiene-bucal/2060448-dentifrico-frescor/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060446-higiene-bucal/2060449-dentifrico-infantil/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060446-higiene-bucal/2060450-enjuagues/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060446-higiene-bucal/2060455-productos-protesis-dentales/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060446-higiene-bucal/2060454-sedas-dentales/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060487-higiene-intima-/2060491-aseo-intimo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060487-higiene-intima-/2060488-compresas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060487-higiene-intima-/2060492-productos-de-incontinencia/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060487-higiene-intima-/2060490-protege-slip/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060487-higiene-intima-/2060489-tampones/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/5000160-higiene-y-cuidado-del-cabello/5000167-aceites-y-ampollas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/5000160-higiene-y-cuidado-del-cabello/5000162-acondicionador/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/5000160-higiene-y-cuidado-del-cabello/5000176-cera-y-cremas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/5000160-higiene-y-cuidado-del-cabello/5000161-champu/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/5000160-higiene-y-cuidado-del-cabello/5000165-crema-y-serum/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/5000160-higiene-y-cuidado-del-cabello/5000174-espuma/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/5000160-higiene-y-cuidado-del-cabello/5000175-gel-y-agua-de-peinado/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/5000160-higiene-y-cuidado-del-cabello/5000173-laca/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/5000160-higiene-y-cuidado-del-cabello/5000168-locion-y-spray/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/5000160-higiene-y-cuidado-del-cabello/5000163-mascarilla/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/5000160-higiene-y-cuidado-del-cabello/5000170-protector-termico/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/5000160-higiene-y-cuidado-del-cabello/5000171-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060523-parafarmacia-/5000118-bienestar-sexual/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060523-parafarmacia-/5000128-botiquin/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060523-parafarmacia-/5000123-complementos-nutricionales/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060523-parafarmacia-/5000124-confiteria/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060523-parafarmacia-/5000125-control-de-peso/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060523-parafarmacia-/5000115-dermocosmetica-capilar/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060523-parafarmacia-/5000112-dermocosmetica-cuerpo-y-cara/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060523-parafarmacia-/5000119-higiene-bucodental/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060523-parafarmacia-/5000129-incontinencia/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060523-parafarmacia-/5000188-mundo-bebe/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060523-parafarmacia-/5000127-ortopedia/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060523-parafarmacia-/5000113-proteccion-solar/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060506-solares/2060512-aftersun/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060506-solares/2060513-autobronceadores/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060506-solares/2060507-proteccion-alta/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060506-solares/2060509-proteccion-baja/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060506-solares/2060511-proteccion-facial-labial-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060506-solares/2060510-proteccion-infantil/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060506-solares/2060508-proteccion-media/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060506-solares/5000109-proteccion-muy-alta/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060514-utiles-higiene-y-belleza/2060521-accesorios-bano-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060514-utiles-higiene-y-belleza/2060517-adornos-cabello-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060514-utiles-higiene-y-belleza/2060518-adornos-cabello-infantil/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060514-utiles-higiene-y-belleza/2060515-cepillos-y-peines/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060514-utiles-higiene-y-belleza/2060516-horquillas-rulos-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060514-utiles-higiene-y-belleza/2060522-neceser/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060401-higiene-y-belleza/2060514-utiles-higiene-y-belleza/2060520-sales-aceites-y-otros-bano/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060581-ambientador-e-insecticidas/2060584-ambientador-aerosol/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060581-ambientador-e-insecticidas/2060586-ambientador-antihumedad/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060581-ambientador-e-insecticidas/2060585-ambientador-coche/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060581-ambientador-e-insecticidas/2060582-ambientador-electrico/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060581-ambientador-e-insecticidas/2060583-ambientador-minispray/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060581-ambientador-e-insecticidas/2060587-otros-ambientadores/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060581-ambientador-e-insecticidas/2060590-antipolillas-y-anticarcoma/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060581-ambientador-e-insecticidas/2060589-insecticida-no-voladores/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060581-ambientador-e-insecticidas/2060588-insecticidas-voladores/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060606-bolsas-de-basura/2060607-bolsas-pequenas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060606-bolsas-de-basura/2060608-bolsas-30-l/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060606-bolsas-de-basura/2060609-bolsas-50-l/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060606-bolsas-de-basura/2060610-bolsas-100-l/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060546-complementos-lavado/2060550-complementos-de-planchado/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060546-complementos-lavado/2060549-descalcificadores-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060546-complementos-lavado/2060547-quitamanchas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060546-complementos-lavado/2060548-tintes/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060601-conservacion-alimentos/2060602-aluminio/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060601-conservacion-alimentos/2060604-bolsas-de-conservacion/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060601-conservacion-alimentos/6000182-complementos-cocina/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060601-conservacion-alimentos/2060603-film/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060601-conservacion-alimentos/2060605-papel-horno-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060539-detergente-jabon-y-suavizante/2060540-detergente-maquina-liquido/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060539-detergente-jabon-y-suavizante/2060542-detergente-maquina-pastillas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060539-detergente-jabon-y-suavizante/2060541-detergente-maquina-polvo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060539-detergente-jabon-y-suavizante/5000327-ecologicos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060539-detergente-jabon-y-suavizante/2060544-lavado-a-mano/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060539-detergente-jabon-y-suavizante/2060543-prendas-delicadas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060539-detergente-jabon-y-suavizante/2060545-suavizantes/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060564-lavavajillas/2060569-abrillantador/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060564-lavavajillas/2060571-ambientador-lavavajillas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060564-lavavajillas/5000330-ecologicos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060564-lavavajillas/2060565-lavavajillas-mano/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060564-lavavajillas/2060568-lavavajillas-maquina-liquido/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060564-lavavajillas/2060566-lavavajillas-maquina-pastillas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060564-lavavajillas/2060567-lavavajillas-maquina-polvo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060564-lavavajillas/2060570-sal-lavavajillas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060551-lejia-y-amoniaco/2060554-lejia-con-detergente/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060551-lejia-y-amoniaco/2060552-lejia-lavadora/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060551-lejia-y-amoniaco/2060553-lejia-multiusos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060551-lejia-y-amoniaco/2060555-liquidos-fuertes/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060556-limpiahogar-y-bano/5000329-ecologicos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060556-limpiahogar-y-bano/2060557-limpiador-bano/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060556-limpiahogar-y-bano/2060558-limpiador-cocina/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060556-limpiahogar-y-bano/2060562-limpiador-cristal/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060556-limpiahogar-y-bano/2060561-limpiador-muebles/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060556-limpiahogar-y-bano/2060560-limpiador-suelos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060556-limpiahogar-y-bano/2060563-limpiador-tapiceria-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060556-limpiahogar-y-bano/2060559-multiusos-y-multisuperficies/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060612-limpieza-calzado/2060620-cepillos-y-otros-accesorios/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060612-limpieza-calzado/2060619-grasas-ceras-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060612-limpieza-calzado/2060613-limpiador-aplicador/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060612-limpieza-calzado/2060615-limpiador-esponja/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060612-limpieza-calzado/2060614-limpiador-tarro-lata-y-tubo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060612-limpieza-calzado/2060617-limpiador-toallitas/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060612-limpieza-calzado/2060621-tintes-calzado/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060597-papel-cocina-y-servilletas/2060598-papel-cocina/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060597-papel-cocina-y-servilletas/2060599-servilletas-y-manteles/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060592-papel-higienico-y-panuelos/2060595-panuelos-bolsillo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060592-papel-higienico-y-panuelos/2060596-panuelos-faciales/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060592-papel-higienico-y-panuelos/2060593-papel-higienico/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060592-papel-higienico-y-panuelos/2060594-papel-higienico-humedo/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060572-utiles-limpieza/2060575-bayetas-/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060572-utiles-limpieza/2060578-escobas-y-palos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060572-utiles-limpieza/2060573-estropajos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060572-utiles-limpieza/2060576-fregona/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060572-utiles-limpieza/2060574-guantes/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060572-utiles-limpieza/2060577-mopa/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060572-utiles-limpieza/2060579-plumeros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060538-limpieza/2060572-utiles-limpieza/2060580-recogedores-y-otros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060623-mascotas/2060632-gatos/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060623-mascotas/2060624-perros/'},
{termino:'https://supermercado.eroski.es/es/supermercado/2060623-mascotas/4000021-pequenas-mascotas/'},

]

async function buscarEnAmbosSupermercados(terminosConCategorias) {
    try {
        let terminoIndex = 0;
  
        if (fs.existsSync('busqueda_termino_eroski')) {
            // Si el archivo existe, se lee el último término guardado
            const ultimoTermino = fs.readFileSync('busqueda_termino_eroski', 'utf8');
            // Encontrar el índice del último término en el array terminosConCategorias
            terminoIndex = terminosConCategorias.findIndex(item => item.termino === ultimoTermino);
            // Si no se encuentra el término, comenzar desde el primer término
            if (terminoIndex === -1) {
                terminoIndex = 0;
            } else {
                // Incrementar el índice para pasar al siguiente término
                terminoIndex++;
            }
        }
  
        for (let i = terminoIndex; i < terminosConCategorias.length; i++) {
          const { categoria, subcategoria, termino } = terminosConCategorias[i];
          console.log(`Buscando término: ${termino}`);
      
          const resultadosDia = await buscarEnEroski(termino,categoria,subcategoria);
          await new Promise(resolve => setTimeout(resolve, 2000));
          // Insertar los resultados en la base de datos y esperar a que todas las inserciones se completen
          await insertarProductos(resultadosDia, categoria, subcategoria);
      
          // Se guarda el término actual
          fs.writeFileSync('busqueda_termino_eroski', termino);
      
          console.log(`Terminó de buscar el término ${termino}.`);
      }
      
  
        console.log('Búsqueda completada.');
  
        // Cerrar conexión a la base de datos
        db.end(); // Suponiendo que `db` es tu objeto de conexión a la base de datos
  
        console.log('Proceso completado.');
  
    } catch (error) {
        console.error('Error en la búsqueda en ambos supermercados:', error);
        throw new Error('Error en la búsqueda en ambos supermercados');
    }
  }

  async function insertarProductos(productos) {
    try {
        console.log(`Insertando ${productos.length} productos en la base de datos...`);

        // Iterar sobre cada producto y realizar la inserción en la base de datos
        for (const producto of productos) {
            // Verificar si las categorías y el término están definidos
            // Extraer la marca del producto según las especificaciones
            let marca = 'Eroski';
            let frase = producto.nombre;
    let match = null
    if (/E. Natur/i.test(frase)) {
        frase = frase.replace(/E. Natur/i, "EROSKI NATUR");
      } else if (frase.includes("Eroski Natur")) {
        frase = frase.replace("Eroski Natur", "EROSKI NATUR");
      } else if (frase.includes("EROSKI Natur")) {
        frase = frase.replace("EROSKI Natur", "EROSKI NATUR");
      }
   
        match = frase.match(/\b[A-Z]+\b/g);
      
      if (match !== null) {
        let palabrasMayusculas= match;
        palabrasMayusculas = palabrasMayusculas.map(palabra => palabra.trim());
        console.log(palabrasMayusculas); // ["EROSKI NATUR"]
         marca = palabrasMayusculas.join(" ");
        console.log(marca); // "EROSKI NATUR"
      }
      
    
            console.log(`Insertando producto: ${producto.nombre}, Marca: ${marca}`);
            console.log(producto.numero)
  
            // Construir la consulta SQL para insertar el producto
            const query = `INSERT INTO supermercado_eroski (id_producto, nombre, imagen, precioNormal, precioOferta, 
              CategoriaSuper1, CategoriaSuper2, CategoriaSuper3, marca, supermercado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
            // Ejecutar la consulta SQL
            await db.execute(query, [
                producto.idProducto,
                producto.nombre,
                producto.imagen,
                producto.precioNormal,
                producto.precioOferta,
                producto.l1Categoria,
                producto.l2Categoria,
                producto.l3Categoria,
                marca.toLowerCase(),
                producto.supermercado
            ].filter(param => param !== undefined));
            console.log(`Producto insertado: ${producto.nombre}`);
        }
        console.log(`Todos los productos insertados en la base de datos.`);
    } catch (error) {
        console.error(`Error al insertar productos en la base de datos:`, error);
        throw new Error(`Error al insertar productos en la base de datos`);
    }
}

  


  // Inicia el servidor en el puerto especificado
  app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
  });
  
  // Conexión a la base de datos
  db.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
    } else {
        console.log('Conexión a la base de datos exitosa');

        // Ejemplo de uso de la función buscarEnAmbosSupermercados
        buscarEnAmbosSupermercados(terminos)
        .then(() => {
            console.log('Búsqueda en ambos supermercados completada y duplicados eliminados.');
        })
        .catch(error => {
            console.error('Error en la búsqueda en ambos supermercados:', error);
        });
    }    
});