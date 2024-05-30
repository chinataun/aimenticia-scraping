// Importación de librerías
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

  
 
  
  // Define la ruta de búsqueda en la aplicación
  async function buscarEnDia(terminos) {
    try {
        let resultadosTotales = [];
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.goto(terminos);

        let previousHeight;
        let currentHeight = 0;

        // Realizamos el scroll hasta que el alto de la página ya no aumente
        while (previousHeight !== currentHeight) {
            previousHeight = currentHeight;
            currentHeight = await autoScroll(page);
        }

        // Después de cargar completamente la página, ahora podemos extraer los productos
        const content = await page.content();
        const $ = cheerio.load(content);

            const currentResults = $('[data-test-id="product-card"]').map((index, element) => {
                const nombre = $(element).find('[data-test-id="search-product-card-name"]').text().trim();
                const objectId = $(element).attr('object_id');
                const marca = $(element).attr('dia_brand') === 'true' ? 'Dia' : $(element).attr('brand');
                const supermercado = 'Dia';
                const imagenSrc = $(element).find('[data-test-id="search-product-card-image"]').attr('src');
                const imagen = `https://www.dia.es${imagenSrc}`;
                
                // Detectar si el producto tiene oferta
                const tieneOfertaElement = $(element).find('[data-test-id="product-special-offer"]');
                const tieneOferta = tieneOfertaElement.length > 0;
                let precioOferta = '';
                let precioNormal = '';

                if (tieneOferta) {
                    precioOferta = tieneOfertaElement.find('.product-special-offer__strikethrough-price').text().trim();
                    precioNormal = $(element).find('.search-product-card__prices [data-test-id="search-product-card-unit-price"]').text().trim();
                } else {
                    precioNormal = $(element).find('.search-product-card__prices [data-test-id="search-product-card-unit-price"]').text().trim();
                    precioOferta = '0.0';
                }

                precioOferta = precioOferta.replace('€', '').replace(',', '.').trim();
                precioNormal = precioNormal.replace('€', '').replace(',', '.').trim();
                const l1Categoria = $('.plp-breadcrumb__first-level-category').text().trim() || null;
                const l2Categoria = $('.plp-breadcrumb__second-level-category').text().trim() || null;                
                const l3Categoria = $(element).attr('l3_category_description') || null;
                // Detectar si el producto tiene oferta y obtener precios
                // Código para obtener precios...

                return { nombre, precioNormal, precioOferta,supermercado, marca, imagen,objectId, l1Categoria, l2Categoria, l3Categoria };
            }).get().filter(result => result !== null);

            if (currentResults.length === 0) {
                hasMoreData = false;
            } else {
                resultadosTotales.push(...currentResults);
                console.log(resultadosTotales)

                // Scroll hacia abajo
                await autoScroll(page);
            }
        

        await browser.close();

        console.log(`Terminó de buscar el término en Día: ${terminos}`);
        return resultadosTotales;
    } catch (error) {
        console.error(error);
        throw new Error('Error en la búsqueda en Día');
    }
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}




const terminos=[
    {termino:'https://www.dia.es/charcuteria-y-quesos/jamon-cocido-lacon-fiambres-y-mortadela/c/L2001'},
    {termino:'https://www.dia.es/charcuteria-y-quesos/jamon-curado-y-paleta/c/L2004'},
    {termino:'https://www.dia.es/charcuteria-y-quesos/lomo-chorizo-fuet-salchichon/c/L2005'},
    {termino:'https://www.dia.es/charcuteria-y-quesos/queso-curado-semicurado-y-tierno/c/L2007'},
    {termino:'https://www.dia.es/charcuteria-y-quesos/queso-fresco/c/L2008'},
    {termino:'https://www.dia.es/charcuteria-y-quesos/queso-azul-y-roquefort/c/L2009'},
    {termino:'https://www.dia.es/charcuteria-y-quesos/quesos-fundidos-y-cremas/c/L2010'},
    {termino:'https://www.dia.es/charcuteria-y-quesos/quesos-internacionales/c/L2011'},
    {termino:'https://www.dia.es/charcuteria-y-quesos/salchichas/c/L2206'},
    {termino:'https://www.dia.es/charcuteria-y-quesos/foie-pate-y-sobrasada/c/L2012'},
    {termino:'https://www.dia.es/carniceria/pollo/c/L2202'},
    {termino:'https://www.dia.es/carniceria/vacuno/c/L2013'},
    {termino:'https://www.dia.es/carniceria/cerdo/c/L2014'},
    {termino:'https://www.dia.es/carniceria/pavo/c/L2015'},
    {termino:'https://www.dia.es/carniceria/conejo/c/L2016'},
    {termino:'https://www.dia.es/carniceria/hamburguesas-y-carne-picada/c/L2017'},
    {termino:'https://www.dia.es/pescados-mariscos-y-ahumados/pescados/c/L2019'},
    {termino:'https://www.dia.es/pescados-mariscos-y-ahumados/mariscos/c/L2194'},
    {termino:'https://www.dia.es/pescados-mariscos-y-ahumados/ahumados-salazones-y-preparados/c/L2020'},
    {termino:'https://www.dia.es/pescados-mariscos-y-ahumados/gulas-y-surimi/c/L2021'},
    {termino:'https://www.dia.es/verduras/ajos-cebollas-y-puerros/c/L2022'},
    {termino:'https://www.dia.es/verduras/tomates-pimientos-y-pepinos/c/L2023'},
    {termino:'https://www.dia.es/verduras/calabacin-calabaza-y-berenjena/c/L2181'},
    {termino:'https://www.dia.es/verduras/judias-brocolis-y-coliflores/c/L2024'},
    {termino:'https://www.dia.es/verduras/espinacas-y-alcachofas/c/L2025'},
    {termino:'https://www.dia.es/verduras/lechuga-escarolas-y-endivias/c/L2027'},
    {termino:'https://www.dia.es/verduras/patatas-y-zanahorias/c/L2028'},
    {termino:'https://www.dia.es/verduras/setas-y-champinones/c/L2029'},
    {termino:'https://www.dia.es/verduras/verduras-y-ensaladas-preparadas/c/L2030'},
    {termino:'https://www.dia.es/verduras/otras-verduras/c/L2031'},
    {termino:'https://www.dia.es/frutas/manzanas/c/L2032'},
    {termino:'https://www.dia.es/frutas/platanos/c/L2033'},
    {termino:'https://www.dia.es/frutas/peras/c/L2034'},
    {termino:'https://www.dia.es/frutas/naranjas-y-mandarinas/c/L2196'},
    {termino:'https://www.dia.es/frutas/uvas/c/L2035'},
    {termino:'https://www.dia.es/frutas/limones-y-pomelos/c/L2037'},
    {termino:'https://www.dia.es/frutas/frutas-del-bosque/c/L2038'},
    {termino:'https://www.dia.es/frutas/frutas-tropicales/c/L2039'},
    {termino:'https://www.dia.es/frutas/frutas-de-temporada/c/L2040'},
    {termino:'https://www.dia.es/frutas/frutas-deshidratadas/c/L2041'},
    {termino:'https://www.dia.es/leche-huevos-y-mantequilla/leche/c/L2051'},
    {termino:'https://www.dia.es/leche-huevos-y-mantequilla/bebidas-vegetales/c/L2052'},
    {termino:'https://www.dia.es/leche-huevos-y-mantequilla/batidos-y-horchatas/c/L2053'},
    {termino:'https://www.dia.es/leche-huevos-y-mantequilla/huevos/c/L2055'},
    {termino:'https://www.dia.es/leche-huevos-y-mantequilla/mantequilla-y-margarina/c/L2056'},
    {termino:'https://www.dia.es/leche-huevos-y-mantequilla/nata/c/L2054'},
    {termino:'https://www.dia.es/yogures-y-postres/yogures-bifidus-y-colesterol/c/L2078'},
    {termino:'https://www.dia.es/yogures-y-postres/yogures-naturales/c/L2079'},
    {termino:'https://www.dia.es/yogures-y-postres/yogures-desnatados/c/L2080'},
    {termino:'https://www.dia.es/yogures-y-postres/yogures-de-sabores-y-frutas/c/L2081'},
    {termino:'https://www.dia.es/yogures-y-postres/griegos-y-mousse/c/L2082'},
    {termino:'https://www.dia.es/yogures-y-postres/yogures-infantiles/c/L2083'},
    {termino:'https://www.dia.es/yogures-y-postres/yogures-de-soja-y-enriquecidos/c/L2084'},
    {termino:'https://www.dia.es/yogures-y-postres/kefir-y-otros-yogures/c/L2085'},
    {termino:'https://www.dia.es/yogures-y-postres/cuajada/c/L2086'},
    {termino:'https://www.dia.es/yogures-y-postres/arroz-con-leche-y-postre-tradicional/c/L2087'},
    {termino:'https://www.dia.es/yogures-y-postres/natillas-y-flan/c/L2088'},
    {termino:'https://www.dia.es/yogures-y-postres/gelatinas-y-otros-postres/c/L2089'},
    {termino:'https://www.dia.es/arroz-pastas-y-legumbres/arroz/c/L2042'},
    {termino:'https://www.dia.es/arroz-pastas-y-legumbres/pastas/c/L2044'},
    {termino:'https://www.dia.es/arroz-pastas-y-legumbres/garbanzos/c/L2191'},
    {termino:'https://www.dia.es/arroz-pastas-y-legumbres/alubias/c/L2178'},
    {termino:'https://www.dia.es/arroz-pastas-y-legumbres/lentejas/c/L2193'},
    {termino:'https://www.dia.es/arroz-pastas-y-legumbres/quinoa-y-couscous/c/L2043'},
    {termino:'https://www.dia.es/aceites-salsas-y-especias/aceites/c/L2046'},
    {termino:'https://www.dia.es/aceites-salsas-y-especias/vinagres-y-alinos/c/L2047'},
    {termino:'https://www.dia.es/aceites-salsas-y-especias/tomate/c/L2208'},
    {termino:'https://www.dia.es/aceites-salsas-y-especias/mayonesa-ketchup-y-otras-salsas/c/L2050'},
    {termino:'https://www.dia.es/aceites-salsas-y-especias/sal-y-especias/c/L2048'},
    {termino:'https://www.dia.es/conservas-caldos-y-cremas/atun-bonito-y-caballa/c/L2179'},
    {termino:'https://www.dia.es/conservas-caldos-y-cremas/berberechos/c/L2180'},
    {termino:'https://www.dia.es/conservas-caldos-y-cremas/mejillones/c/L2195'},
    {termino:'https://www.dia.es/conservas-caldos-y-cremas/sardinas-y-sardinillas/c/L2207'},
    {termino:'https://www.dia.es/conservas-caldos-y-cremas/otras-conservas-de-pescado/c/L2197'},
    {termino:'https://www.dia.es/conservas-caldos-y-cremas/conservas-vegetales/c/L2092'},
    {termino:'https://www.dia.es/conservas-caldos-y-cremas/sopas-caldos-y-pures-deshidratados/c/L2093'},
    {termino:'https://www.dia.es/conservas-caldos-y-cremas/cremas-y-caldos-liquidos/c/L2094'},
    {termino:'https://www.dia.es/panes-harinas-y-masas/pan-recien-horneado/c/L2070'},
    {termino:'https://www.dia.es/panes-harinas-y-masas/pan-de-molde-perritos-y-hamburguesas/c/L2069'},
    {termino:'https://www.dia.es/panes-harinas-y-masas/picos-y-panes-tostados/c/L2071'},
    {termino:'https://www.dia.es/panes-harinas-y-masas/pan-rallado/c/L2072'},
    {termino:'https://www.dia.es/panes-harinas-y-masas/harinas-y-levaduras/c/L2075'},
    {termino:'https://www.dia.es/panes-harinas-y-masas/masas-y-hojaldres/c/L2076'},
    {termino:'https://www.dia.es/panes-harinas-y-masas/preparados-para-postres/c/L2077'},
    {termino:'https://www.dia.es/cafe-cacao-e-infusiones/cafe/c/L2057'},
    {termino:'https://www.dia.es/cafe-cacao-e-infusiones/cacao/c/L2058'},
    {termino:'https://www.dia.es/cafe-cacao-e-infusiones/te-e-infusiones/c/L2059'},
    {termino:'https://www.dia.es/azucar-chocolates-y-caramelos/azucar-y-edulcorantes/c/L2060'},
    {termino:'https://www.dia.es/azucar-chocolates-y-caramelos/miel/c/L2061'},
    {termino:'https://www.dia.es/azucar-chocolates-y-caramelos/mermeladas-y-frutas-en-almibar/c/L2062'},
    {termino:'https://www.dia.es/azucar-chocolates-y-caramelos/cremas-de-cacao/c/L2228'},
    {termino:'https://www.dia.es/azucar-chocolates-y-caramelos/chocolates-y-bombones/c/L2063'},
    {termino:'https://www.dia.es/azucar-chocolates-y-caramelos/caramelos-chicles-y-golosinas/c/L2064'},
    {termino:'https://www.dia.es/galletas-bollos-y-cereales/galletas/c/L2065'},
    {termino:'https://www.dia.es/galletas-bollos-y-cereales/galletas-saladas/c/L2066'},
    {termino:'https://www.dia.es/galletas-bollos-y-cereales/bolleria/c/L2067'},
    {termino:'https://www.dia.es/galletas-bollos-y-cereales/cereales/c/L2068'},
    {termino:'https://www.dia.es/galletas-bollos-y-cereales/tortitas/c/L2216'},
    {termino:'https://www.dia.es/patatas-fritas-encurtidos-y-frutos-secos/patatas-fritas-y-aperitivos/c/L2098'},
    {termino:'https://www.dia.es/patatas-fritas-encurtidos-y-frutos-secos/aceitunas-y-encurtidos/c/L2096'},
    {termino:'https://www.dia.es/patatas-fritas-encurtidos-y-frutos-secos/frutos-secos/c/L2097'},
    {termino:'https://www.dia.es/pizzas-y-platos-preparados/pizzas/c/L2101'},
    {termino:'https://www.dia.es/pizzas-y-platos-preparados/precocinados-envasados/c/L2102'},
    {termino:'https://www.dia.es/pizzas-y-platos-preparados/comida-internacional/c/L2103'},
    {termino:'https://www.dia.es/pizzas-y-platos-preparados/tortillas-y-empanadas/c/L2105'},
    {termino:'https://www.dia.es/pizzas-y-platos-preparados/gazpachos-y-salmorejos/c/L2106'},
    {termino:'https://www.dia.es/congelados/helados-y-hielo/c/L2130'},
    {termino:'https://www.dia.es/congelados/pizzas-bases-y-masas/c/L2131'},
    {termino:'https://www.dia.es/congelados/pescado-y-marisco/c/L2132'},
    {termino:'https://www.dia.es/congelados/carne-y-pollo/c/L2133'},
    {termino:'https://www.dia.es/congelados/verduras-hortalizas-y-salteados/c/L2210'},
    {termino:'https://www.dia.es/congelados/patatas-fritas/c/L2213'},
    {termino:'https://www.dia.es/congelados/croquetas-y-rebozados/c/L2135'},
    {termino:'https://www.dia.es/congelados/churros-y-postres/c/L2136'},
    {termino:'https://www.dia.es/congelados/lasanas-y-pasta/c/L2137'},
    {termino:'https://www.dia.es/agua-refrescos-y-zumos/agua/c/L2107'},
    {termino:'https://www.dia.es/agua-refrescos-y-zumos/cola/c/L2108'},
    {termino:'https://www.dia.es/agua-refrescos-y-zumos/naranja/c/L2212'},
    {termino:'https://www.dia.es/agua-refrescos-y-zumos/limon-lima-limon/c/L2109'},
    {termino:'https://www.dia.es/agua-refrescos-y-zumos/tes-frios-cafes-frios/c/L2111'},
    {termino:'https://www.dia.es/agua-refrescos-y-zumos/tonicas/c/L2112'},
    {termino:'https://www.dia.es/agua-refrescos-y-zumos/gaseosa/c/L2192'},
    {termino:'https://www.dia.es/agua-refrescos-y-zumos/bebidas-energeticas/c/L2217'},
    {termino:'https://www.dia.es/agua-refrescos-y-zumos/bebidas-isotonicas/c/L2114'},
    {termino:'https://www.dia.es/agua-refrescos-y-zumos/zumos/c/L2113'},
    {termino:'https://www.dia.es/agua-refrescos-y-zumos/otras-bebidas/c/L2110'},
    {termino:'https://www.dia.es/cervezas-vinos-y-bebidas-con-alcohol/cervezas/c/L2115'},
    {termino:'https://www.dia.es/cervezas-vinos-y-bebidas-con-alcohol/cervezas-especiales/c/L2117'},
    {termino:'https://www.dia.es/cervezas-vinos-y-bebidas-con-alcohol/cervezas-con-limon/c/L2182'},
    {termino:'https://www.dia.es/cervezas-vinos-y-bebidas-con-alcohol/cervezas-sin-alcohol/c/L2118'},
    {termino:'https://www.dia.es/cervezas-vinos-y-bebidas-con-alcohol/tinto-de-verano-y-sangria/c/L2119'},
    {termino:'https://www.dia.es/cervezas-vinos-y-bebidas-con-alcohol/vino-tinto/c/L2120'},
    {termino:'https://www.dia.es/cervezas-vinos-y-bebidas-con-alcohol/vino-blanco/c/L2121'},
    {termino:'https://www.dia.es/cervezas-vinos-y-bebidas-con-alcohol/cavas-y-sidra/c/L2122'},
    {termino:'https://www.dia.es/cervezas-vinos-y-bebidas-con-alcohol/vino-rosado/c/L2124'},
    {termino:'https://www.dia.es/cervezas-vinos-y-bebidas-con-alcohol/ginebra-y-vodka/c/L2125'},
    {termino:'https://www.dia.es/cervezas-vinos-y-bebidas-con-alcohol/ron-y-whisky/c/L2128'},
    {termino:'https://www.dia.es/cervezas-vinos-y-bebidas-con-alcohol/vermouth/c/L2127'},
    {termino:'https://www.dia.es/cervezas-vinos-y-bebidas-con-alcohol/cremas-y-licores/c/L2129'},
    {termino:'https://www.dia.es/cervezas-vinos-y-bebidas-con-alcohol/brandy/c/L2126'},
    {termino:'https://www.dia.es/limpieza-y-hogar/cuidado-de-la-ropa/c/L2170'},
    {termino:'https://www.dia.es/limpieza-y-hogar/lavavajillas/c/L2167'},
    {termino:'https://www.dia.es/limpieza-y-hogar/papel-higienico-de-cocina-servilletas/c/L2168'},
    {termino:'https://www.dia.es/limpieza-y-hogar/utensilios-de-limpieza/c/L2159'},
    {termino:'https://www.dia.es/limpieza-y-hogar/bolsas-de-basura/c/L2160'},
    {termino:'https://www.dia.es/limpieza-y-hogar/lejia-y-otros-quimicos/c/L2161'},
    {termino:'https://www.dia.es/limpieza-y-hogar/cristales-y-suelos/c/L2162'},
    {termino:'https://www.dia.es/limpieza-y-hogar/limpia-muebles-y-multiusos/c/L2163'},
    {termino:'https://www.dia.es/limpieza-y-hogar/limpieza-bano-y-wc/c/L2164'},
    {termino:'https://www.dia.es/limpieza-y-hogar/limpieza-cocina-y-vitroceramica/c/L2166'},
    {termino:'https://www.dia.es/limpieza-y-hogar/papel-de-aluminio-horno-y-film/c/L2169'},
    {termino:'https://www.dia.es/limpieza-y-hogar/insecticidas/c/L2173'},
    {termino:'https://www.dia.es/limpieza-y-hogar/ambientadores/c/L2226'},
    {termino:'https://www.dia.es/limpieza-y-hogar/calzado/c/L2171'},
    {termino:'https://www.dia.es/limpieza-y-hogar/utiles-del-hogar-pilas-bombillas/c/L2209'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/hidratacion-corporal/c/L2153'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/gel-de-ducha-y-esponjas/c/L2211'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/cuidado-bucal/c/L2151'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/desodorantes/c/L2154'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/champu/c/L2144'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/acondicionadores-y-mascarillas/c/L2145'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/espumas-y-fijadores/c/L2146'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/tintes/c/L2147'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/limpieza-facial-crema-facial/c/L2148'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/quitaesmalte/c/L2186'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/afeitado/c/L2150'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/depilacion/c/L2188'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/colonias/c/L2155'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/jabon-de-manos/c/L2156'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/cremas-solares/c/L2227'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/compresas-y-cuidado-intimo/c/L2158'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/complementos-nutricionales/c/L2183'},
    {termino:'https://www.dia.es/perfumeria-higiene-salud/parafarmacia/c/L2184'},
    {termino:'https://www.dia.es/bebe/leche-infantil/c/L2139'},
    {termino:'https://www.dia.es/bebe/potitos-y-tarritos/c/L2141'},
    {termino:'https://www.dia.es/bebe/yogures-bolsitas-de-frutas-y-snacks/c/L2140'},
    {termino:'https://www.dia.es/bebe/panales-y-toallitas/c/L2142'},
    {termino:'https://www.dia.es/bebe/cuidado-del-bebe/c/L2143'},
    {termino:'https://www.dia.es/mascotas/perros/c/L2174'},
    {termino:'https://www.dia.es/mascotas/gatos/c/L2175'},
    {termino:'https://www.dia.es/mascotas/otros-animales/c/L2176'},]
// Función para insertar los resultados de búsqueda en la base de datos
// Función para insertar un producto en la base de datos evitando duplicados
async function buscarEnAmbosSupermercados(terminosConCategorias) {
    try {
        let terminoIndex = 0;
  
        if (fs.existsSync('busqueda_termino_dia')) {
            // Si el archivo existe, se lee el último término guardado
            const ultimoTermino = fs.readFileSync('busqueda_termino_dia', 'utf8');
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
          const { termino } = terminosConCategorias[i];
          console.log(`Buscando término: ${termino}`);
      
          const resultadosDia = await buscarEnDia(termino);
          await new Promise(resolve => setTimeout(resolve, 2000));
          // Insertar los resultados en la base de datos y esperar a que todas las inserciones se completen
          await insertarProductos(resultadosDia);
      
          // Se guarda el término actual
          fs.writeFileSync('busqueda_termino_dia', termino);
      
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
        for (const producto of productos) {
            console.log(producto)
            const query = `INSERT INTO supermercado_dia (id_producto, nombre, imagen, precioNormal, precioOferta, CategoriaSuper1, CategoriaSuper2, CategoriaSuper3, marca, supermercado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ? )`;
                    await db.execute(query, [
                        producto.objectId,
                        producto.nombre,
                        producto.imagen,
                        producto.precioNormal,
                        producto.precioOferta,
                        producto.l1Categoria,
                        producto.l2Categoria,
                        producto.l3Categoria,
                        producto.marca ?? '', // Utiliza el operador de fusión nula para proporcionar un valor predeterminado
                        producto.supermercado
                    ].filter(param => param !== undefined));
                            }
                            console.log(`Productos insertados en la base de datos.`);
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

        buscarEnAmbosSupermercados(terminos)
            .then(() => {
                console.log('Búsqueda en ambos supermercados completada y duplicados eliminados.');
            })
            .catch(error => {
                console.error('Error en la búsqueda en ambos supermercados:', error);
            });
    }
});