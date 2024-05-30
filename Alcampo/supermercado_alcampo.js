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


// async function buscarEnAlcampo(terminos, categoria, subcategoria) {
//     try {
//         let resultadosTotales = new Set(); // Usar un Set para evitar duplicados
//         console.log(`Buscando término en Alcampo: ${terminos}`);
        
//         const url = terminos;
//         const browser = await puppeteer.launch({ headless: "new" });
//         const page = await browser.newPage();
//         await page.goto(url);
        
//         // Esperar a que aparezca un selector CSS específico en la página
//         await page.waitForSelector('.product-card-container');

//         // Hacer scroll hasta el final de la página para cargar todos los productos
//         await page.evaluate(async () => {
//             await new Promise(resolve => {
//                 let lastHeight = 0;
//                 const scrollDelay = 1000; // Tiempo entre cada desplazamiento en milisegundos
//                 const distance = 100;
//                 const timer = setInterval(() => {
//                     const scrollHeight = document.body.scrollHeight;
//                     window.scrollBy(0, distance);
//                     const currentHeight = document.documentElement.scrollTop;
                    
//                     if (currentHeight === lastHeight || currentHeight === scrollHeight) {
//                         clearInterval(timer);
//                         resolve();
//                     }
//                     lastHeight = currentHeight;
//                 }, scrollDelay);
//             });
//         });

//         const html = await page.content();
//         const $ = cheerio.load(html);

//         $('.product-card-container').each((index, element) => {
//             const nombre = $(element).find('h3[data-test="fop-title"]').text().trim();
            // const precioTexto = $(element).find('.price__PriceText-sc-1nlvmq9-0.BCfDm').text().trim();
            // const precio = parseFloat(precioTexto.replace(',', '.'));

            // const imagen = $(element).find('.image-container img').attr('src');

           
//             // Agregar el nombre al conjunto de resultadosTotales
//             resultadosTotales.add(nombre, imagen, precio);
//         });

//         await browser.close();
//         console.log(`Terminó de buscar el término en Alcampo: ${terminos}`);
        
//         // Convertir el Set a un Array antes de devolverlo
//         const resultadosArray = [...resultadosTotales];
//         console.log(resultadosArray); // Imprimir el array
//         return resultadosArray;
//     } catch (error) {
//         console.error(error);
//         throw new Error('Error en la búsqueda en Alcampo');
//     }
// }
async function buscarEnAlcampo(terminos, categoria, subcategoria) {
    try {
        const resultadosTotales = new Set(); // Usar un Set para evitar duplicados
        console.log(`Buscando término en Alcampo: ${terminos}`);
        
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.goto(terminos);

        let previousHeight;
        let currentHeight = 0;
        while (previousHeight !== currentHeight) {
            previousHeight = currentHeight;
            currentHeight = await autoScroll(page, resultadosTotales); // Pasar el conjunto como argumento
        }

        await browser.close();
        console.log(`Terminó de buscar el término en Alcampo: ${terminos}`);
        

        return resultadosTotales; // Devolver el conjunto directamente
    } catch (error) {
        console.error(error);
        throw new Error('Error en la búsqueda en Alcampo');
    }
}


async function autoScroll(page, resultadosTotales) {
    let totalHeight = 0;
    const distance = 100;

    while (true) {
        const newProductos = await page.evaluate(() => {
            const productosEnPagina = [];
            document.querySelectorAll('.product-card-container').forEach(element => {
                const nombreElement = element.querySelector('h3[data-test="fop-title"]');
                if (nombreElement) {
                    const nombre = nombreElement.textContent.trim();
                    const precioElement = element.querySelectorAll('span._text_f6lbl_1._text--m_f6lbl_23.price__PriceText-sc-1nlvmq9-0.BCfDm');
                    const precioTexto = precioElement[precioElement.length - 1].textContent.trim().replace('€', '').replace(',', '.');
                    
                    const imagenElement = element.querySelector('.image-container img');
                    const imagen = imagenElement ? imagenElement.getAttribute('src') : '';
                               // Extraer el idProducto de la URL de la imagen utilizando expresiones regulares
                               const idProductoMatch = imagen.match(/\/([^\/]+)\/[^\/]+\.jpg$/);
                               const idProducto = idProductoMatch ? idProductoMatch[1] : null;
                    const promotionContainer = element.querySelector('.promotion-container');
                    let precioOferta = 0.0;
                    const promotionText = promotionContainer.textContent.trim();
                    if (promotionText.includes("Producto en Folleto") || promotionText.includes("Ofertones")) {
                        precioOferta = -1.0; // Establecer precioOferta en -1 si contiene el texto
                    }
                    
                    const breadcrumb = document.querySelector('ul.breadcrumb__List-sc-1w347cc-0.keGyt');
                    const l1categoria = breadcrumb.querySelector('li:nth-child(2) a').textContent.trim();
                    const l2categoria = breadcrumb.querySelector('li:nth-child(3) a').textContent.trim();
                    const l3categoria = breadcrumb.querySelector('li:nth-child(4) h1').textContent.trim();
                    
                    const producto = {
                        nombre: nombre,
                        precioNormal: precioTexto,
                        precioOferta: precioOferta,
                        idProducto:idProducto,
                        supermercado:"Alcampo",
                        marca:"",
                        imagen: imagen,
                        l1categoria: l1categoria,
                        l2categoria: l2categoria,
                        l3categoria: l3categoria
                    };
                    productosEnPagina.push(producto);
                }
            });
            return productosEnPagina;
        });

        // Verificar y agregar nuevos productos al conjunto
        newProductos.forEach(producto => {
            // Verificar si ya existe un producto con el mismo nombre e imagen
            const exists = [...resultadosTotales].some(existingProducto =>
                existingProducto.nombre === producto.nombre && existingProducto.imagen === producto.imagen
            );
            if (!exists&&producto.imagen) {
                // Agregar producto al Set si no existe
                resultadosTotales.add(producto);
            }
        });

        const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
        await page.evaluate((distance) => {
            window.scrollBy(0, distance);
        }, distance);

        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
            break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar un breve período antes de recoger más productos
    }

    return totalHeight;
}









const terminos=[
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/frutas/pl%C3%A1tanos-y-bananas/OC170104?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/frutas/naranjas-mandarinas-y-limones/OC170101?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/frutas/tropicales-y-ex%C3%B3ticas/OC170106?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/frutas/fresas/OC170109001?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/frutas/peras-y-manzanas/OC170102001?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/frutas/frutas-de-temporada/OC170105?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/frutas/sand%C3%ADas-y-melones/OC170110?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/frutas/frutas-del-bosque/OC170109?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/frutas/frutas-ecol%C3%B3gicas/OC170107?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/frutas/zumo-exprimido/OC12082022?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/frutas/fruta-cortada/OC170105003?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/frutas/pur%C3%A9-y-snacks-de-frutas/OCPureSnacksFrutas?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/verduras-y-hortalizas/ensaladas-y-verduras-preparadas/OC170209?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/verduras-y-hortalizas/patatas-ajos-y-cebollas/OCPatataAjoCebolla?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/verduras-y-hortalizas/tomates-pepinos-y-pimientos/OC170207?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/verduras-y-hortalizas/zanahorias-y-puerros/OC170208009?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/verduras-y-hortalizas/calabaza-calabac%C3%ADn-y-berenjenas/OCCalabazasBerenjenas?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/verduras-y-hortalizas/lechugas-coliflor-y-repollos/OCLechugasColRepollo?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/verduras-y-hortalizas/jud%C3%ADa-alcachofa-y-esp%C3%A1rragos/OCJudiasEsparragos?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/verduras-y-hortalizas/champi%C3%B1ones-y-setas/OC170204?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/verduras-y-hortalizas/verduras-ecol%C3%B3gicas/OC170210?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/verduras-y-hortalizas/arom%C3%A1ticas-manojos-y-otras/OC170208?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/carne/pollo/OC1301?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/carne/vacuno/OC1304?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/carne/cerdo/OC1302?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/carne/elaborados/OC1307?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/carne/burguer-meat-y-picada/OC1827?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/carne/cordero/OC1303?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/carne/pavo/OC130103?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/carne/otras-aves/OC130110?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/carne/conejo/OC1305?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/carne/equino-y-caza/OC1309?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/carne/casquer%C3%ADa/OC1308?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/pescados-mariscos-y-moluscos/marisco/OC1402?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/pescados-mariscos-y-moluscos/calamar-sepia-y-otros-cefal%C3%B3podos-frescos/OC1846?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/pescados-mariscos-y-moluscos/bacalao-y-salazones/OC1407?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/pescados-mariscos-y-moluscos/pulpo-fresco/OC1409?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/ahumados-suced%C3%A1neos-gulas-anchoas/ahumados/OC1403?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/ahumados-suced%C3%A1neos-gulas-anchoas/sucedaneo-de-angula/OC140401?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/ahumados-suced%C3%A1neos-gulas-anchoas/surimi/OC140402?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/ahumados-suced%C3%A1neos-gulas-anchoas/pulpo-cocido-y-en-su-jugo/OC140503?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/ahumados-suced%C3%A1neos-gulas-anchoas/anchoas/OC140601?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/ahumados-suced%C3%A1neos-gulas-anchoas/boquerones-en-vinagre/OC140602?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/ahumados-suced%C3%A1neos-gulas-anchoas/mejillones/OC14050301?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/ahumados-suced%C3%A1neos-gulas-anchoas/tapas-de-marisco-pescado/OC14050302?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/ahumados-suced%C3%A1neos-gulas-anchoas/huevas-y-sucedaneos/OC14050303?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/ahumados-suced%C3%A1neos-gulas-anchoas/pates-y-cremas-de-marisco/OC14050304?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/ahumados-suced%C3%A1neos-gulas-anchoas/otros-cefal%C3%B3podos/OCcefalopodos?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/ahumados-suced%C3%A1neos-gulas-anchoas/especial-de-bacalao/OCESPBAC?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/jamones-y-paletas/jam%C3%B3n-cebo-ib%C3%A9rico/OC15100102?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/jamones-y-paletas/jam%C3%B3n-bellota-ib%C3%A9rica/OC15100103?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/jamones-y-paletas/jam%C3%B3n-curado-o-serrano/OC15100101?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/jamones-y-paletas/lotes-de-jam%C3%B3n/OC15100107?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/jamones-y-paletas/paleta-cebo-ib%C3%A9rica/OC15100105?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/jamones-y-paletas/paleta-bellota-ib%C3%A9rica/OC15100106?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/jamones-y-paletas/paleta-curada-o-serrana/OC15100104?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/charcuter%C3%ADa/loncheado-fresco-cocido/OC1781?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/charcuter%C3%ADa/loncheado-fresco-curado/OC178111?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/charcuter%C3%ADa/loncheado-cocido/OC178112?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/charcuter%C3%ADa/loncheado-curado/OC178113?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/charcuter%C3%ADa/loncheado-ib%C3%A9rico/OC178114?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/charcuter%C3%ADa/embutidos-piezas-enteras/OC178115?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/charcuter%C3%ADa/fiambres-piezas-enteras/OC178116?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/charcuter%C3%ADa/salchichas/OC178117?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/charcuter%C3%ADa/tacos-y-piezas-lomo-y-jam%C3%B3n/OC178118?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/charcuter%C3%ADa/foie-gras-pat%C3%A9s-y-sobrasadas/OC1504?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/charcuter%C3%ADa/charcuteria-en-taquitos/OC154002?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/quesos/quesos-mostrador-al-corte/OCQueso?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/quesos/queso-en-lonchas/OC3504?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/quesos/queso-rallado-y-ensalada/OC3505?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/quesos/untables-y-cremas-de-queso/OC3506?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/quesos/queso-fresco/OC3503?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/quesos/queso-puro-oveja/OC350101?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/quesos/queso-mezcla-semicurado/OC350103?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/quesos/queso-mezcla-curado/OC350102?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/quesos/queso-de-cabra/OC350104?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/quesos/queso-tierno/OC350105?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/quesos/quesos-especialidades/OC3502?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/quesos/tablas-y-cortados/OC350207?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/quesos/queso-en-porciones/OC350601?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/quesos/membrillo-y-tarta-de-queso/OCMembrilloTartaQueso?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/quesos/quesos-regionales/OC350106?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/panader%C3%ADa/empanadas/OC12818?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/panader%C3%ADa/barras-chapatas-y-baguettes/OC12811?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/panader%C3%ADa/panes-y-hogazas/OC12813?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/panader%C3%ADa/pan-integral-y-sin-sal/OC12814?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/panader%C3%ADa/pan-cortado-y-de-molde/OC12815?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/panader%C3%ADa/peque%C3%B1os-formatos/OC12816?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/panader%C3%ADa/pan-con-cereales/OC12810?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/panader%C3%ADa/volovanes-tartaletas-y-pan-tostado/OC12819?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/panader%C3%ADa/levadura-fresca/OC128111?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/panader%C3%ADa/snacks-salados/OC12817?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/pasteler%C3%ADa/tartas-pasteles-y-pastas-de-t%C3%A9/OC12821?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/pasteler%C3%ADa/muffins-magdalenas-y-bizcochos/OC12822?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/pasteler%C3%ADa/palmeras-croissants-y-napolitanas/OC12825?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/pasteler%C3%ADa/rosquillas-y-berlinas/OC12823?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/pasteler%C3%ADa/otros-bollos-y-hojaldres/OC12827?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/frescos/pasteler%C3%ADa/productos-regionales/OC12829?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/leche/leche-semidesnatada/OCSemidesnatada?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/leche/leche-entera/OCEntera?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/leche/leche-desnatada/OCDesnatada?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/leche/leche-baja-o-sin-lactosa/OCSinlactosa?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/leche/leche-con-calcio/OCLechecalcio?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/leche/leche-fresca/OCFresca?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/leche/leche-oveja-o-cabra/OCLecheoveja?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/leche/preparados-l%C3%A1cteos-omega-3/OCPreparadosomega3leche?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/leche/infantil-energ%C3%ADa-y-crecimiento/OCPreparadoinfantilleche?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/leche/preparados-fibra-y-control-colesterol/OCPreparadofibracolesterolleche?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/leche/leche-ecol%C3%B3gica/OClecheeco?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/bebidas-vegetales/bebidas-de-soja/OC160314?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/bebidas-vegetales/bebidas-de-avena/OC16031001?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/bebidas-vegetales/bebidas-de-arroz/OC16031002?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/bebidas-vegetales/bebidas-de-almendra/OC16031003?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/bebidas-vegetales/otras/OC0911202125?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/preparado-l%C3%A1cteo/preparados-l%C3%A1cteos-omega-3/OCPreparadosomega3?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/preparado-l%C3%A1cteo/infantil-energ%C3%ADa-y-crecimiento/OCPreparadoinfantil?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/preparado-l%C3%A1cteo/preparados-fibra-y-control-colesterol/OCPreparadofibra?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/huevos/clase-l/OC160802?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/huevos/clase-s-y-m/OC160801?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/huevos/clase-xl/OC160803?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/huevos/huevos-camperos/OCHuevocampero?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/huevos/huevos-codorniz-y-especiales/OCHuevosespeciales?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/huevos/huevos-cocidos-y-claras/OCCocidos?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/huevos/huevos-ecol%C3%B3gicos/OCHuevosECO?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/huevos/huevo-hilado/OCHuevohilado?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/yogures-b%C3%ADfidus-y-l-casei/yogures-bifidus/OC160104?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/yogures-b%C3%ADfidus-y-l-casei/l-casei/OC160105?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/yogures-b%C3%ADfidus-y-l-casei/yogures-funcionales/OC160106?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/yogures-b%C3%ADfidus-y-l-casei/yogures-naturales/OC160101?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/yogures-b%C3%ADfidus-y-l-casei/yogures-sabores/OC160102?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/yogures-b%C3%ADfidus-y-l-casei/yogures-griegos-y-cremosos/OC160108?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/yogures-b%C3%ADfidus-y-l-casei/yogures-desnatados/OC160103?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/yogures-b%C3%ADfidus-y-l-casei/yogures-con-snacks/OC160110?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/yogures-b%C3%ADfidus-y-l-casei/yogures-de-cabra-oveja/OC160129?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/yogures-b%C3%ADfidus-y-l-casei/yogures-l%C3%ADquidos/OC160134?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/yogures-b%C3%ADfidus-y-l-casei/yogures-ecol%C3%B3gicos/OC1164866351?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/postres-lacteos/petit-o-infantiles/OC160201?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/postres-lacteos/natillas/OC160202?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/postres-lacteos/flan-crema-catalana-y-otros/OC160210?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/postres-lacteos/gelatina/OC160212?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/postres-lacteos/copa-y-mousse/OC160213?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/postres-lacteos/postres-italianos/OC160214?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/postres-lacteos/otros-postres/OC160215?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/postres-lacteos/soja-almendra-avena/OC160109?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/postres-lacteos/kefir/OC160211?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/mantequilla/mantequilla-con-sal/OC160601?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/mantequilla/mantequilla-sin-sal/OC160602?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/mantequilla/mantequillas-especiales/OC160603?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/mantequilla/mantequillas-ecol%C3%B3gicas/OC1164869540?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/nata/nata-para-montar/OC160502?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/nata/salsas-para-cocina/OC160504?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/nata/nata-en-spray/OC160503?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/nata/nata-para-cocinar/OC160501?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/batidos-y-horchatas/batidos/OCBatidos?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/batidos-y-horchatas/horchata/OC160404?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/zumos-con-leche/OC160403?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/leche-condensada-polvo-y-evaporada/leche-condensada/OC160308?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/leche-huevos-l%C3%A1cteos-yogures-y-bebidas-vegetales/leche-condensada-polvo-y-evaporada/en-polvo-y-evaporada/OC160309?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/aceite-vinagre-sal-y-especias/aceites/OC2301?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/aceite-vinagre-sal-y-especias/vinagres/OC1001?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/aceite-vinagre-sal-y-especias/sal-especias-y-sazonadores/OC100111?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-de-pescado/at%C3%BAn/OCConservasAtun?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-de-pescado/bonito-y-ventresca/OC100402004?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-de-pescado/mejillones/OC100402010?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-de-pescado/agujas-sardinas-y-sardinillas/OC100402005?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-de-pescado/anchoas-y-boquerones/OC100402007?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-de-pescado/caballa-y-melva/OC100402006?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-de-pescado/berberechos/OC100402011?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-de-pescado/almejas-navajas-y-zamburi%C3%B1as/OC100402012?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-de-pescado/calamares-pulpo-chipirones-sepia/OCConservasCalamares?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-de-pescado/otras-conservas-de-pescado/OCOtrasConservasPescado?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-vegetales/esp%C3%A1rragos/OC100401005?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-vegetales/ma%C3%ADz-guisantes-y-zanahorias/OC100401013?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-vegetales/pimientos-rojos/OC100401007?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-vegetales/tomates-triturados/OC100401008?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-vegetales/champi%C3%B1ones-setas-y-trufas/OC100401004?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-vegetales/jud%C3%ADas-verdes-patatas-y-cebollas/OC100401006?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-vegetales/alcachofas/OC100401001?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-vegetales/macedonias-y-menestras/OC100401010?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-vegetales/pisto-y-sofritos/OC100401011?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-vegetales/otras-conservas-vegetales/OCOtrasConservasVegetales?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-vegetales/conservas-vegetales-ecol%C3%B3gicas/OC1163072207?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-c%C3%A1rnicas-platos-preparados-y-alm%C3%ADbares/pat%C3%A9s-y-foie-gras/OC100403?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-c%C3%A1rnicas-platos-preparados-y-alm%C3%ADbares/conservas-de-carne/OC100406?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-c%C3%A1rnicas-platos-preparados-y-alm%C3%ADbares/frutas-en-conserva-y-alm%C3%ADbares/OC100405?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/conservas-c%C3%A1rnicas-platos-preparados-y-alm%C3%ADbares/platos-preparados-en-conserva/OC100404?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/tomate-frito-y-salsas/tomate-frito/OCSalsaTomate?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/tomate-frito-y-salsas/ketchup/OC100202003?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/tomate-frito-y-salsas/mayonesa/OCMayonesa?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/tomate-frito-y-salsas/salsas-para-carne/OCSalsasCarne?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/tomate-frito-y-salsas/mostaza/OCMostaza?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/tomate-frito-y-salsas/salsas-para-pasta/OCSalsasPasta?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/tomate-frito-y-salsas/salsas-picantes/OCSalsasPicantes?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/tomate-frito-y-salsas/salsa-c%C3%A9sar-y-yogur/OCSalsasEnsalada?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/tomate-frito-y-salsas/romesco/OCSalsaromesco?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/tomate-frito-y-salsas/otras-salsas/OC1002?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/tomate-frito-y-salsas/salsas-deshidratadas/OCsalsasdeshidratadas?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/tomate-frito-y-salsas/preparados-de-verdura-y-tomate/OCpreparadosverdura?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/tomate-frito-y-salsas/salsas-de-ajo-y-ali-oli/OCsalsasajo?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/tomate-frito-y-salsas/salsas-de-soja/OCsalsasoja?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/aperitivos-aceitunas-y-frutos-secos/frutos-secos/OC100302?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/aperitivos-aceitunas-y-frutos-secos/patatas-fritas/OC100304?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/aperitivos-aceitunas-y-frutos-secos/snacks/OC100306?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/aperitivos-aceitunas-y-frutos-secos/aceitunas-y-encurtidos/OC100301?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/aperitivos-aceitunas-y-frutos-secos/palomitas/OC100303?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/pasta-alimenticia/macarrones-y-pasta-corta/OC100501002?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/pasta-alimenticia/espaguetis-y-tallarines/OC100501001?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/pasta-alimenticia/fideos-y-pasta-sopa/OC100501003?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/pasta-alimenticia/pasta-con-vegetales/OC100501005?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/pasta-alimenticia/pasta-integral/OC100501006?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/pasta-alimenticia/pasta-al-huevo/OC100501004?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/pasta-alimenticia/canelones-y-lasa%C3%B1as/OC100501007?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/pasta-alimenticia/espirales-y-lacitos/OC100501011?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/pasta-alimenticia/otras-pastas/OC100501009?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/pasta-alimenticia/pasta-rellena/OC100501008?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/pasta-alimenticia/pasta-tavola-in-italia/OCtavola?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/pasta-alimenticia/salsas-para-pastas/OC100501010?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/pasta-alimenticia/pasta-ecol%C3%B3gica/OCpastaeco?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/arroz-y-legumbres/arroz/OC100502?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/arroz-y-legumbres/legumbres/OC2112208?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/arroz-y-legumbres/quinoa-couscous-y-otros/OC100506?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/panader%C3%ADa-harina-y-masas/harinas-y-masas/OC100605012?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/panader%C3%ADa-harina-y-masas/pan-de-molde/OCPanMolde?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/panader%C3%ADa-harina-y-masas/pan-especial/OC101004?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/panader%C3%ADa-harina-y-masas/pan-hamburguesa-perrito-y-especiales/OC101005?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/panader%C3%ADa-harina-y-masas/pan-tostado/OC1010?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/panader%C3%ADa-harina-y-masas/picos-y-snacks/OC101011?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/panader%C3%ADa-harina-y-masas/pan-rallado-y-pan-precocinado/OCPanRalladoPrecocinado?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/panader%C3%ADa-harina-y-masas/panader%C3%ADa-industrial-ecol%C3%B3gica/OCPanaderiaeco?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/sopas-caldos-y-cremas/sopas/OCSopas?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/sopas-caldos-y-cremas/caldos/OCCaldos?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/sopas-caldos-y-cremas/cremas/OCCremas?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/sopas-caldos-y-cremas/pur%C3%A9/OC100607001?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/comida-internacional/comida-oriental/OCComidaOriental?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/comida-internacional/comida-mexicana/OC100608?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/comida-internacional/otros-alimentos-del-mundo/OC10060903?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/alimentaci%C3%B3n/comida-internacional/salsas-internacionales/OCSalsasOrientales?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/caf%C3%A9s/caf%C3%A9-c%C3%A1psulas/OC1008061?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/caf%C3%A9s/caf%C3%A9-molido/OC1008064?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/caf%C3%A9s/cereales-y-achicoria-soluble/OC100806010?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/caf%C3%A9s/caf%C3%A9-en-grano/OC1008063?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/caf%C3%A9s/caf%C3%A9-soluble/OC1008062?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/caf%C3%A9s/capuchino/OC100806009?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/caf%C3%A9s/caf%C3%A9-ecol%C3%B3gico/OCcafeeco?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/caf%C3%A9s/caf%C3%A9s-preparados/OC241?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/galletas/galletas-mar%C3%ADa/OC100805001?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/galletas/tostadas-y-artesanas/OC100805036?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/galletas/galletas-digestive/OC100805003?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/galletas/galletas-con-cereales/OC100805011?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/galletas/galletas-infantiles/OC100805013?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/galletas/galletas-chocolate/OC100805006?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/galletas/galletas-rellenas/OC100805007?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/galletas/galletas-sin-az%C3%BAcar-a%C3%B1adido/OC10120202?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/galletas/bizcochos-y-barquillos/OC100805008?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/galletas/surtido-galletas-y-pastas/OC100805010?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/galletas/galletas-de-mantequilla/OC100805023?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/galletas/galletas-ecol%C3%B3gicas/OC100805205?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/chocolates-cremas-untar-y-bombones/tabletas-de-chocolate/OC100803?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/chocolates-cremas-untar-y-bombones/cremas-de-untar-chocolate-y-otras/OC100803019?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/chocolates-cremas-untar-y-bombones/snacks-de-chocolate/OC100803005?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/chocolates-cremas-untar-y-bombones/bombones-y-trufas/OC100901?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/chocolates-cremas-untar-y-bombones/figuras-y-calendario-navidad/OC306041?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/chocolates-cremas-untar-y-bombones/chocolate-en-c%C3%A1psulas/OC100803015?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/chocolates-cremas-untar-y-bombones/chocolate-a-la-taza/OC100803016?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/boller%C3%ADa-y-pasteler%C3%ADa/croissants-magdalenas-y-muffins/OC101104?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/boller%C3%ADa-y-pasteler%C3%ADa/rosquillas-y-sobaos/OCRosquillassobaos?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/boller%C3%ADa-y-pasteler%C3%ADa/palmeras-hojaldres-y-ca%C3%B1as/OC101113?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/boller%C3%ADa-y-pasteler%C3%ADa/pastelitos-bizcochos-y-cocas/OCpastelitos?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/boller%C3%ADa-y-pasteler%C3%ADa/napolitanas-caracolas-y-ensaimadas/OCnapolitanascaracolasensaimadas?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/boller%C3%ADa-y-pasteler%C3%ADa/brioche-y-pan-de-leche/OC101102?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/boller%C3%ADa-y-pasteler%C3%ADa/plumcakes-y-brazos/OC101114?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/boller%C3%ADa-y-pasteler%C3%ADa/gofres-crepes-y-tortitas/OC101115?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/boller%C3%ADa-y-pasteler%C3%ADa/tortas-pastas-y-especialidades/OCTortasPastasEspecialidades?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/boller%C3%ADa-y-pasteler%C3%ADa/boller%C3%ADa-ecol%C3%B3gica/OCpasteleriaeco?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/cereales-y-barritas/cereales-con-chocolate/OC100804003?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/cereales-y-barritas/cereales-l%C3%ADnea/OC100804006?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/cereales-y-barritas/cereales-muesli/OC100804004?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/cereales-y-barritas/cereales-con-fibra/OC100804005?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/cereales-y-barritas/cereales-con-miel/OC100804002?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/cereales-y-barritas/barritas-cereales/OC100804008?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/cereales-y-barritas/cornflakes/OC100804001?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/cereales-y-barritas/otros-cereales-infantiles/OC100804007?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/cereales-y-barritas/cereales-ecol%C3%B3gicos/OC100804009?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/az%C3%BAcar-miel-y-otros-edulcorantes/az%C3%BAcar/OC100801?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/az%C3%BAcar-miel-y-otros-edulcorantes/edulcorantes/OC100801009?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/az%C3%BAcar-miel-y-otros-edulcorantes/panela/OC100801010?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/az%C3%BAcar-miel-y-otros-edulcorantes/miel/OC100811?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/az%C3%BAcar-miel-y-otros-edulcorantes/az%C3%BAcar-y-edulcorante-ecol%C3%B3gicos/OCazucareco?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/cacaos-solubles/cacao-polvo-soluble/OC100808?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/cacaos-solubles/cacao-polvo-instantaneo/OC1116216216?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/cacaos-solubles/cacao-polvo-especialidades/OC1116216215?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/cacaos-solubles/cacao-a-la-taza/OC1116216211?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/cacaos-solubles/cacao-en-monodosis/OC1116216214?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/cacaos-solubles/cacaos-ecol%C3%B3gicos/OCcacaoseco?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/t%C3%A9-e-infusiones/infusiones-monodosis/OC100807008?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/t%C3%A9-e-infusiones/t%C3%A9/OC100807007?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/t%C3%A9-e-infusiones/infusiones/OC100807006?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/t%C3%A9-e-infusiones/yerba-mate/OC100807005?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/t%C3%A9-e-infusiones/poleo-menta/OC100807003?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/t%C3%A9-e-infusiones/tila/OC100807004?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/t%C3%A9-e-infusiones/manzanilla/OC100807002?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/t%C3%A9-e-infusiones/t%C3%A9-e-infusiones-ecol%C3%B3gicas/OC100807009?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/mermelada-almibares-membrillo/mermelada-y-confitura/OC100810?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/mermelada-almibares-membrillo/alm%C3%ADbares/OC142018?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/mermelada-almibares-membrillo/membrillo-melaza-y-otros/OCMembrilloOtros?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/golosinas/caramelos/OC100902002?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/golosinas/caramelos-de-goma/OC100902003?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/golosinas/chicles/OC100902001?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/golosinas/chocolatinas/OC100902005?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/golosinas/nubes/OC100902004?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/golosinas/otros/OC100902006?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/preparaci%C3%B3n-postres/leche-condensada-polvo-y-evaporada/OC10071201?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/preparaci%C3%B3n-postres/impulsores-y-gasificantes/OC100703?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/preparaci%C3%B3n-postres/postres/OC10071203?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/preparaci%C3%B3n-postres/caramelo-l%C3%ADquido-y-siropes/OC100711?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/preparaci%C3%B3n-postres/complementos/OC100712?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/preparaci%C3%B3n-postres/toque-final-o-decoraci%C3%B3n/OC10071215?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/preparaci%C3%B3n-postres/velas/OC10071218?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/preparaci%C3%B3n-postres/levaduras/OC10071217?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/pescados-mariscos-y-surimis/pescados-congelados/OC120102?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/pescados-mariscos-y-surimis/mariscos-congelados/OC120105?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/pescados-mariscos-y-surimis/pescados-empanados/OC120505?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/pescados-mariscos-y-surimis/calamares-y-mariscos-rebozados/OC120506?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/pescados-mariscos-y-surimis/surimis/OC120104?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/pescados-mariscos-y-surimis/suced%C3%A1neos-de-angula/OCCongeladoGulas?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/helados/polo/OC120804?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/helados/snacks/OC120805?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/helados/galletas-y-barquillos/OCBarquillos?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/helados/diet%C3%A9ticos-y-ecol%C3%B3gicos/OC120809?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/helados/granizados/OC289?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/helados/barras-y-bloques/OCBarrasHelado?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/helados/bombones/OC120802?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/helados/tarrinas/OCTarrinasHelado?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/helados/conos/OC120803?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/helados/s%C3%A1ndwich/OC120806?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/verduras-congeladas/preparados-de-verdura/OC120311?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/verduras-congeladas/acelgas-y-espinacas/OC120303?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/verduras-congeladas/ajo-cebolla-y-maiz/OC120309?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/verduras-congeladas/alcachofas-y-cardos/OC120305?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/verduras-congeladas/col-coliflor-y-br%C3%B3coli/OC120304?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/verduras-congeladas/champi%C3%B1%C3%B3n-y-zanahoria/OC120307?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/verduras-congeladas/ensaladilla-y-menestra/OC120308?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/verduras-congeladas/esp%C3%A1rragos-y-guisantes/OC120302?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/verduras-congeladas/jud%C3%ADas-habas-y-pochas/OC120301?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/verduras-congeladas/otras-verduras/OC120310?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/platos-preparados/salteados-y-arroces/OC1206?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/platos-preparados/sopas-y-cremas/OCSopasCremasCongeladas?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/platos-preparados/platos-de-pasta/OC120502?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/platos-preparados/platos-de-carne/OCPlatosCarneCongelados?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/platos-preparados/platos-de-pescado/OCPlatosPescadoCongelados?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/platos-preparados/platos-orientales/OCPlatosOrientalesCongelados?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/platos-preparados/pizzas-congeladas/OC120401?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/platos-preparados/wraps-crepes-y-hojaldres/OCCrepesHojaldres?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/platos-preparados/aperitivos/OC120501?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/platos-preparados/platos-mejicanos/OCPlatosMejicanosCongelados?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/patatas-croquetas-y-empanadillas/empanadillas/OC120504?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/patatas-croquetas-y-empanadillas/patatas-fritas/OC120312?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/patatas-croquetas-y-empanadillas/croquetas/OC120503?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/san-jacobos-y-pollo-empanado/san-jacobos/OCSanJacobos?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/san-jacobos-y-pollo-empanado/flamenquines/OCFlamenquines?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/san-jacobos-y-pollo-empanado/nuggets/OCNuggets?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/san-jacobos-y-pollo-empanado/fingers/OCFingers?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/san-jacobos-y-pollo-empanado/pechuga-empanada/OCPechugaEmpanada?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/san-jacobos-y-pollo-empanado/escalope-cord%C3%B3n-blue/OCEscalopePollo?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/reposter%C3%ADa-hielo-y-bolsas-isot%C3%A9rmicas/hielo-y-bolsas-isot%C3%A9rmicas/OC1210?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/reposter%C3%ADa-hielo-y-bolsas-isot%C3%A9rmicas/pan-y-masas/OCPanCongelado?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/reposter%C3%ADa-hielo-y-bolsas-isot%C3%A9rmicas/churros-y-porras/OCChurros?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/tartas-postres-y-fruta-congelada/profiteroles-y-otros-postres/OC12093?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/tartas-postres-y-fruta-congelada/fruta-congelada/OC12094?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/congelados/tartas-postres-y-fruta-congelada/tartas-y-brazos/OC12091?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/sushi/sushi-y-sashimi/OC1405021?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/sushi/ensaladas-pokes-y-tallarines/OC1405022?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/sushi/gyozas-brochetas-y-pollo/OC1405023?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/pizzas/pizzas-refrigeradas/OC9411?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/pizzas/pizzas-masa-fina-congeladas/OC9412?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/pizzas/paninis/OC9413?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/pizzas/pizzas-especiales-congeladas/OC9414?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/pizzas/pizzas-masa-gruesa-congeladas/OC9415?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/pizzas/bases-de-pizza-congeladas/OC9416?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/gazpachos-y-cremas/gazpachos/OC9431?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/gazpachos-y-cremas/salmorejos/OC9432?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/gazpachos-y-cremas/sopas-y-cremas-refrigeradas/OC094274?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/arroces-y-pastas/pasta-fresca/OC09433?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/arroces-y-pastas/platos-de-pasta-refrigerada/OC20022018521?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/arroces-y-pastas/pasta-fresca-rellena/OC20022018522?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/arroces-y-pastas/salsa-para-pasta/OC20022018523?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/arroces-y-pastas/pasta-fresca-lisa/OC20022018524?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/otras-especialidades/platos-cocinados-refrigerados/OC094271?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/otras-especialidades/croquetas-refrigeradas/OC094272?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/otras-especialidades/salsas/OC094273?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/otras-especialidades/aperitivos/OC094275?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/hummus-guacamole-y-otros/hummus-y-guacamole/OC0908201811?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/platos-internacionales/platos-mexicanos-refrigerados/OC094211?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/platos-internacionales/otros-platos-internacionales/OC094212?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/masas-y-bases/masas/OC09431?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/masas-y-bases/bases/OC09432?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/s%C3%A1ndwiches-bocadillos-y-roscas/s%C3%A1ndwiches/OC20022018531?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/s%C3%A1ndwiches-bocadillos-y-roscas/hamburguesas-y-perritos/OC20022018532?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/s%C3%A1ndwiches-bocadillos-y-roscas/roscas/OC9417?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/s%C3%A1ndwiches-bocadillos-y-roscas/bocadillos-y-wraps/OC20022018533?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/asados-y-carnes/platos-de-carne/OC094231?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/asados-y-carnes/rotis-y-rellenos/OC094232?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/asados-y-carnes/pollo-asado/OC094233?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/asados-y-carnes/estuches-de-asados/OC094234?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/asados-y-carnes/otras-carnes/OC094235?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/asados-y-carnes/callos-y-oreja/OC094236?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/empanadas/empanadas-horneadas/OC094281?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/comida-preparada/empanadas/empanadas-refrigeradas/OC094282?source=navigation'},
    {termino:'https://www.compraonline.alcampo.es/categories/bebidas/refrescos/refresco-de-cola/OCRefrescoCola?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/refrescos/refresco-de-naranja/OCRefrescoNaranja?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/refrescos/refresco-de-lim%C3%B3n-y-lima-lim%C3%B3n/OCRefrescoLimon?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/refrescos/bebidas-energ%C3%A9ticas/OC110311?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/refrescos/bebidas-isot%C3%B3nicas/OC1103111?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/refrescos/t%C3%A9s-y-otros-sabores/OC110308?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/refrescos/refrescos-en-polvo/OC110310?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/refrescos/t%C3%B3nica-y-bitter/OC110303?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/agua-soda-y-gaseosas/aguas-sin-gas/OC1101041?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/agua-soda-y-gaseosas/aguas-con-gas/OC1101042?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/agua-soda-y-gaseosas/aguas-sabores/OC1101043?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/agua-soda-y-gaseosas/gaseosa-y-soda/OCgaseosaysoda?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/zumos-de-frutas/refrigerados/OC110209?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/zumos-de-frutas/zumos-con-leche-soja/OC6331072?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/zumos-de-frutas/n%C3%A9ctar-concentrados-y-exprimidos/OC633107?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/zumos-de-frutas/refrescos-de-zumo/OC6331071?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/zumos-de-frutas/mini-brick/OC110207?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/zumos-de-frutas/mosto/OC110208?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/zumos-de-frutas/sin-az%C3%BAcares-a%C3%B1adidos/OC110210?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/cervezas/cerveza-lata-est%C3%A1ndar/OC110701?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/cervezas/cerveza-botella-est%C3%A1ndar/OC110703?source=navigati'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/cervezas/cervezas-premium/OC110713?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/cervezas/cervezas-gran-formato/OC110702?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/cervezas/radler-y-otros-sabores/OC110714?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/cervezas/cervezas-sin-alcohol/OC110712?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/cervezas/estuches-de-cerveza/OC110718?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/cervezas/ofertas-de-cerveza/OCOfertasAlimentacion?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/cervezas/cervezas-locales/OC110717?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-tinto/rioja/OC11511?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-tinto/ribera-del-duero/OC11512?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-tinto/toro-y-otras-d-o-s-de-castilla-y-le%C3%B3n/OC11513?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-tinto/somontano-y-otras-d-o-s-de-arag%C3%B3n/OC15525?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-tinto/valdepe%C3%B1as-y-otras-d-o-s-de-castilla-la-mancha/OC11515?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-tinto/pened%C3%A9s-y-otras-d-o-s-de-catalu%C3%B1a/OC11516?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-tinto/vinos-de-navarra/OC11514?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-tinto/vinos-comunidad-valenciana-y-baleares/OC111213005?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-tinto/otras-d-o/OC111213006?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-tinto/vinos-ecol%C3%B3gicos/OC11519?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-tinto/vinos-internacionales/OC11518?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-tinto/formatos-especiales/OC115110?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-tinto/estuches-de-vino/OC111009?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-blanco/rueda-y-otras-d-o-s-castilla-y-le%C3%B3n/OC11522?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-blanco/r%C3%ADas-baixas-y-otras-d-o-s-galicia/OC111003001?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-blanco/somontano-y-otras-d-o-s-arag%C3%B3n/OC11525?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-blanco/rioja/OC11524?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-blanco/pened%C3%A9s-y-otras-d-o-s-catalu%C3%B1a/OC111007?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-blanco/valdepe%C3%B1as-y-otras-d-o-castilla-la-mancha/OC11526?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-blanco/vinos-de-andaluc%C3%ADa/OCAndaluciaBlanco?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-blanco/otras-d-o/OC11527?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-blanco/vinos-internacionales/OC11529?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-blanco/formatos-especiales/OC1152110?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-rosados-frizzantes-dulces-y-olorosos/vino-rosado/OC11531?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-rosados-frizzantes-dulces-y-olorosos/vinos-de-jerez-dulces-y-secos/OC11532?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-rosados-frizzantes-dulces-y-olorosos/vinos-de-mesa-brik-y-garrafa/OC11533?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-rosados-frizzantes-dulces-y-olorosos/frizzantes/OC11535?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-rosados-frizzantes-dulces-y-olorosos/sangr%C3%ADas/OC110901?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/vino-rosados-frizzantes-dulces-y-olorosos/tintos-de-verano/OC110904?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/champagne-cavas-y-sidras/cavas-y-estuches/OC11561?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/champagne-cavas-y-sidras/champagne/OC11562?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/champagne-cavas-y-sidras/sidras/OC11563?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/bebidas-alcoh%C3%B3licas/whisky/OC11542?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/bebidas-alcoh%C3%B3licas/ron/OC11543?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/bebidas-alcoh%C3%B3licas/vodka-y-tequila/OC11544?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/bebidas-alcoh%C3%B3licas/brandy-y-cognac/OC11545?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/bebidas-alcoh%C3%B3licas/mojitos-cockteles-y-combinados/OC11546?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/licores/licor-de-frutas/OC11551?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/licores/aguardientes-licores-y-orujos/OC11558?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/licores/cremas/OC11553?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/licores/pachar%C3%A1n/OC11552?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/licores/vermouth/OC11554?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/licores/an%C3%ADs/OC11555?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/licores/ponche/OC11556?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/licores/otros-licores-con-alcohol/OC11559?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/licores/licores-sin-alcohol/OC11557?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/bebidas-ecol%C3%B3gicas/zumos-y-refrescos-ecol%C3%B3gicos/OC1013033?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/bebidas-ecol%C3%B3gicas/cervezas-ecol%C3%B3gicas/OC1013032?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/bebidas-ecol%C3%B3gicas/vinos-y-cavas-ecol%C3%B3gicos/OC1013031?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/bebidas/bebidas-ecol%C3%B3gicas/bebidas-vegetales-ecol%C3%B3gicas/OC121217?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lavado-de-ropa/detergente/OC21040303?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lavado-de-ropa/suavizantes-y-perlas/OC210409?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lavado-de-ropa/activador-de-lavado/OC210401?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lavado-de-ropa/lej%C3%ADa-para-ropa/OC210406?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lavado-de-ropa/productos-para-planchado/OC21040701?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lavado-de-ropa/descalcificadores/OC210411?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lavado-de-ropa/quitamanchas/OC210407?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lavado-de-ropa/quitaolores/OC21040702?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lavado-de-ropa/tintes-y-deste%C3%B1idos/OC210410?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/celulosas/papel-higi%C3%A9nico/OC210101?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/celulosas/rollo-de-cocina/OC210103?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/celulosas/pa%C3%B1uelos-de-papel/OC210102?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/celulosas/servilletas/OC210104?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/limpieza-hogar/azulejos-y-juntas/OC210812?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/limpieza-hogar/desatascador-y-antical/OC210807?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/limpieza-hogar/limpiacristal-y-multiuso/OC210806?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/limpieza-hogar/limpiadores-ba%C3%B1o/OC210802?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/limpieza-hogar/limpiadores-cocina/OC210805?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/limpieza-hogar/limpiahogares-y-suelos/OC210801?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/limpieza-hogar/metal-tejidos-y-otros/OC210809?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/limpieza-hogar/muebles-y-maderas/OC210811?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/limpieza-hogar/muebles-y-maderas/OC210811?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lavavajillas/lavavajillas-a-mano/OC210601?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lavavajillas/lavavajillas-a-m%C3%A1quina/OCLavavajillasMaquina?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lavavajillas/abrillantadores-lavavajillas/OC210604?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lavavajillas/ambientadores-para-lavavajillas/OCAmbientadoresLavavajillas?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lavavajillas/limpiadores-lavavajillas/OCLimpiadoresLavavajillas?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lavavajillas/sal-para-lavavajillas/OCSalLavavajillas?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lej%C3%ADas-y-amon%C3%ADacos/amon%C3%ADacos/OC210705?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lej%C3%ADas-y-amon%C3%ADacos/lej%C3%ADa-con-detergente/OC210702?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lej%C3%ADas-y-amon%C3%ADacos/lej%C3%ADa-normal-y-multiuso/OC210701?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/lej%C3%ADas-y-amon%C3%ADacos/lej%C3%ADa-para-ropa/OC210703?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/ambientadores/el%C3%A9ctricos/OC211006?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/ambientadores/absorbeolores/OC211011?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/ambientadores/decorativos/OC211009?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/ambientadores/autom%C3%A1ticos/OC211007?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/ambientadores/coche/OC211012?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/ambientadores/antihumedad-y-espec%C3%ADficos/OC211010?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/ambientadores/spray/OC211008?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/utensilios-limpieza/bolsas-de-basura/OC210301?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/utensilios-limpieza/bayetas-y-estropajos/OC210901?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/utensilios-limpieza/guantes/OC210906?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/utensilios-limpieza/mopas-y-recambios/OC210902?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/utensilios-limpieza/cepillo-barrer-y-recogedor/OC210905?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/utensilios-limpieza/cepillos-y-desatascadores/OC210904?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/utensilios-limpieza/plumeros-y-quitapelusas/OC210909?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/utensilios-limpieza/limpia-cristales/OC210911?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/utensilios-limpieza/felpudos/OC210910?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/limpieza-calzado/crema-y-mantemiento-de-calzado/OCCremaCalzado?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/limpieza-calzado/esponjas-y-cepillos/OC210506?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/limpieza-calzado/plantillas-para-los-zapatos/OC3691?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/insecticidas/el%C3%A9ctrico/OC211106?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/insecticidas/moscas-mosquitos-avispas-y-otros/OC211103?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/insecticidas/repelentes/OC211107?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/insecticidas/cucarachas-ara%C3%B1as-y-hormigas/OC211102?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/insecticidas/polillas/OC211101?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/insecticidas/carcoma-%C3%A1caros-y-pulgas/OC211108?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/supermercado-ecol%C3%B3gico/droguer%C3%ADa-ecol%C3%B3gica-y-sostenible/celulosa/OC1170204181?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/supermercado-ecol%C3%B3gico/droguer%C3%ADa-ecol%C3%B3gica-y-sostenible/limpieza-hogar/OC1170204182?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/supermercado-ecol%C3%B3gico/droguer%C3%ADa-ecol%C3%B3gica-y-sostenible/lavado-ropa/OC1170204183?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/conservaci%C3%B3n-de-alimentos-y-moldes/bolsas-de-congelado/OC210204?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/conservaci%C3%B3n-de-alimentos-y-moldes/bolsas-de-conservaci%C3%B3n/OC210203?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/conservaci%C3%B3n-de-alimentos-y-moldes/film-alimentario/OC210201?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/conservaci%C3%B3n-de-alimentos-y-moldes/moldes/OC210205?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/droguer%C3%ADa/conservaci%C3%B3n-de-alimentos-y-moldes/papel-de-aluminio-horno-y-bolsas-microondas/OC210202?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/protectores-solares/protecci%C3%B3n-corporal/OC700121?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/protectores-solares/protecci%C3%B3n-facial/OC700122?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/protectores-solares/protecci%C3%B3n-ni%C3%B1os/OC700123?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/protectores-solares/autobronceadores/OC700124?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/protectores-solares/after-sun/OC700125?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-del-cabello/acondicionador/OC7012?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-del-cabello/mascarilla/OC7013?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-del-cabello/coloraci%C3%B3n/OC7014?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-del-cabello/fijadores/OC7015?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-del-cabello/loci%C3%B3n-de-tratamiento/OC7016?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-del-cabello/accesorios-para-cabello/OC7017?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-del-cabello/peines-y-cepillos/OC7018?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/higiene-bucal/pasta-de-dientes/OC7041?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/higiene-bucal/enjuague/OC7042?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/higiene-bucal/cepillos-y-recambios/OC7043?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/higiene-bucal/seda-dental/OC7044?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/higiene-bucal/accesorios-para-pr%C3%B3tesis/OC7045?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-corporal/gel-y-jab%C3%B3n/OC7021?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-corporal/loci%C3%B3n-y-crema-corporal/OC7023?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-corporal/manos/OC7024?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-corporal/pies/OC7025?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-corporal/esponjas-y-accesorios-de-ba%C3%B1o/OC7026?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-corporal/aceites-y-tratamientos/OC7022?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/higiene-%C3%ADntima/compresas/OC7031?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/higiene-%C3%ADntima/incontinencia/OC7034?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/higiene-%C3%ADntima/protege-slip/OC7033?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/higiene-%C3%ADntima/jab%C3%B3n-gel-y-toallitas/OC7035?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/higiene-%C3%ADntima/tampones/OC7032?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/desodorantes/hombre-spray/OC7051?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/desodorantes/hombre-rollon/OC7052?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/desodorantes/mujer-spray/OC7053?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/desodorantes/mujer-rollon/OC7054?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/desodorantes/stick-y-crema/OC7056?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-facial/limpieza-facial/OC7062?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-facial/crema-facial/OC7061?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-facial/contorno-de-ojos/OC7064?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-facial/serum-y-aceites-faciales/OC7063?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/cuidado-facial/exfoliantes-y-mascarillas/OC7065?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/afeitado-y-cuidado-masculino/gel-espuma-y-jab%C3%B3n-crema/OC7074?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/afeitado-y-cuidado-masculino/estuches/OC7078?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/afeitado-y-cuidado-masculino/maquinillas-y-recambios/OC7071?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/afeitado-y-cuidado-masculino/after-shave-y-cuidados-para-barba/OC7076?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/afeitado-y-cuidado-masculino/accesorios/OC7077?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/afeitado-y-cuidado-masculino/cuidado-corporal-y-facial/OC7075?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/afeitado-y-cuidado-masculino/maquinillas-desechables/OC7073?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/colonias/femeninas/OC70101?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/colonias/masculinas/OC70102?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/colonias/ni%C3%B1os-y-familiares/OC70103?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/colonias/estuches-de-se%C3%B1ora/OC70104?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/maquillaje/labios/OC7083?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/maquillaje/ojos/OC7082?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/maquillaje/estuches-de-maquillaje/OC7087?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/maquillaje/u%C3%B1as/OC7084?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/maquillaje/accesorios-algodones-y-toallitas/OC7086?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/maquillaje/rostro/OC7081?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/estuches-de-perfumer%C3%ADa/estuches-de-colonia/OCEstuchesColonia?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/estuches-de-perfumer%C3%ADa/estuches-corporales/OC6900302?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/depilaci%C3%B3n/maquinillas-y-recambios/OC7095?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/depilaci%C3%B3n/maquinillas-desechables/OC7096?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/depilaci%C3%B3n/ceras-calientes-tibias-y-frias/OC7091?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/perfumeria/depilaci%C3%B3n/cremas/OC7094?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/pa%C3%B1ales-y-toallitas/pa%C3%B1ales/OC8011?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/pa%C3%B1ales-y-toallitas/pa%C3%B1ales-de-noche/OC8012?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/pa%C3%B1ales-y-toallitas/pa%C3%B1ales-ba%C3%B1adores/OC8014?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/pa%C3%B1ales-y-toallitas/pa%C3%B1ales-ecol%C3%B3gicos/OC200520204?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/pa%C3%B1ales-y-toallitas/pa%C3%B1ales-dodot/OC280120201?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/pa%C3%B1ales-y-toallitas/toallitas/OC8015?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/alimentaci%C3%B3n-infantil/leches-para-beb%C3%A9s/OC8021?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/alimentaci%C3%B3n-infantil/papillas/OC8022?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/alimentaci%C3%B3n-infantil/tarritos/OC8023?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/alimentaci%C3%B3n-infantil/postres/OC8024?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/alimentaci%C3%B3n-infantil/agua-y-zumos/OC8025?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/alimentaci%C3%B3n-infantil/galletas-y-snacks/OC8027?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/higiene-y-cuidado-beb%C3%A9/jab%C3%B3n-champ%C3%BA-y-gel/OC8041?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/higiene-y-cuidado-beb%C3%A9/esponjas-cepillos-y-tijeras/OC180307?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/higiene-y-cuidado-beb%C3%A9/accesorios-de-ba%C3%B1o/OC1807?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/higiene-y-cuidado-beb%C3%A9/salud-del-beb%C3%A9/OC1805?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/higiene-y-cuidado-beb%C3%A9/talco-y-suero/OC8045?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/higiene-y-cuidado-beb%C3%A9/bastoncillos-algodones-y-gasas/OC8043?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/higiene-y-cuidado-beb%C3%A9/higiene-bucal/OC15062020?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/higiene-y-cuidado-beb%C3%A9/colonias/OC8044?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/higiene-y-cuidado-beb%C3%A9/champ%C3%BA/OC08042?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/higiene-y-cuidado-beb%C3%A9/higiene-infantil-ecol%C3%B3gica/OC200520205?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/higiene-y-cuidado-beb%C3%A9/cremas-hidratantes/OC8042?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/higiene-y-cuidado-beb%C3%A9/geles/OC08041?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/accesorios-para-beb%C3%A9/chupetes-y-mordedores/OC180404?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/accesorios-para-beb%C3%A9/vajillas-y-cubiertos/OC180401?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/accesorios-para-beb%C3%A9/esterilizadores-y-sacaleches/OC180405?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/accesorios-para-beb%C3%A9/biberones-tetinas-y-accesorios/OC180403?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/accesorios-para-beb%C3%A9/baberos/OC180402?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/sin-lactosa/OC220520202?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/alcampo-baby/OC190520203?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/sin-gluten/OC220520201?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/alcampo-baby-ecol%C3%B3gico/OC210520201?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/nenuco/OC190520206?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/beb%C3%A9/cosmia-baby/OC190520204?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/higiene-bucal/enjuague/OC6912?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/higiene-bucal/higiene-dental-senior/OC6915?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/higiene-bucal/seda-dental/OC6914?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/higiene-bucal/dent%C3%ADfricos/OC6911?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/higiene-bucal/cepillos-manuales-y-el%C3%A9ctricos/OC6913?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/parafarmacia-beb%C3%A9/chupetes-tetinas-y-biberones/OC6927?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/parafarmacia-beb%C3%A9/chupetes-tetinas-y-biberones/OC6927?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/parafarmacia-beb%C3%A9/higiene-infantil/OC696?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/botiqu%C3%ADn/heridas-y-golpes/OC6999?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/botiqu%C3%ADn/algodones-y-ap%C3%B3sitos/OC6991?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/botiqu%C3%ADn/antimosquitos/OC6995?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/botiqu%C3%ADn/vendas-gasas-y-esparadrapo/OC6992?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/botiqu%C3%ADn/mascarillas-y-gel/OC6993?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/botiqu%C3%ADn/tos-y-garganta/OC6998?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/botiqu%C3%ADn/term%C3%B3metros-y-tensi%C3%B3metros/OC6994?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/botiqu%C3%ADn/productos-para-pies/OC6996?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-facial/maquillaje/OC69456?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-facial/afeitado-y-cuidado-masculino/OC6945?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-facial/cremas-antiarrugas-e-hidratantes/OC6941?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-facial/contorno-de-ojos/OC6943?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-facial/limpiadores-faciales-y-antiacn%C3%A9/OC6942?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-facial/protectores-labiales/OC6944?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-corporal/cuidado-%C3%ADntimo/OC6955?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-corporal/desodorantes/OC6953?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-corporal/cuidado-corporal-adultos/OC6951?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-corporal/cuidado-de-manos/OC6956?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-corporal/cuidado-de-pies/OC6957?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-corporal/higiene-corporal/OC6952?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-corporal/anticelul%C3%ADticos/OC6954?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-nar%C3%ADz-ojos-y-oidos/higiene-y-cuidado-nar%C3%ADz/OC6971?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-nar%C3%ADz-ojos-y-oidos/%C3%B3ptica-y-cuidado-oftalmol%C3%B3gico/OC6973?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-nar%C3%ADz-ojos-y-oidos/higiene-y-cuidado-oidos/OC6972?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-del-cabello/antiparasitarios/OC6985?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-del-cabello/lociones/OC6983?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-del-cabello/champ%C3%BA/OC6981?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-del-cabello/coloraci%C3%B3n/OC6982?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/cuidado-del-cabello/tratamientos-orales/OC6984?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/bienestar-sexual/preservativos/OC69101?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/bienestar-sexual/lubricantes/OC69102?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/bienestar-sexual/accesorios/OC69103?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/loci%C3%B3n-solar/after-sun/OC69012?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/loci%C3%B3n-solar/protecci%C3%B3n-solar-ni%C3%B1os/OC69013?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/parafarmacia/loci%C3%B3n-solar/protectores-y-leches-solares/OC69011?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/comida-perros/pienso-para-perros/OC200801?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/comida-perros/comida-h%C3%BAmeda-para-perros/OC200802?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/comida-perros/comida-natural-para-perros/OC200620191?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/comida-perros/snacks-y-huesos-para-perros/OC06211?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/higiene-perros/champ%C3%BAs-y-acondicionadores/OC200503?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/higiene-perros/collares/OC201002001?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/higiene-perros/accesorios-pelo/OC201001001?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/higiene-perros/pipetas/OC200505?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/higiene-perros/soluciones/OC201002002?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/higiene-perros/bolsas-excrementos/OC201001002?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/higiene-perros/otros/OC201001003?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/higiene-perros/higiene/OC201001?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/comida-gatos/pienso-para-gatos/OC201301?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/comida-gatos/comida-natural-gatos/OC200620192?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/comida-gatos/comida-h%C3%BAmeda-para-gatos/OC201302?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/comida-gatos/snacks-para-gatos/OC2006?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/comida-gatos/leche-y-malta-para-gatos/OC06244?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/conejos-y-roedores/heno-y-lechos/OC06272?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/conejos-y-roedores/alimentaci%C3%B3n/OC200310?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/conejos-y-roedores/accesorios/OC06273?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/conejos-y-roedores/snacks-y-barritas/OC06271?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/peces-y-tortugas/alimentaci%C3%B3n-peces/OC200410?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/peces-y-tortugas/alimentaci%C3%B3n-tortugas/OC200411?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/peces-y-tortugas/mantenimiento-acuarios/OC06295?source=navigation'},
{termino:'https://www.compraonline.alcampo.es/categories/mascotas/p%C3%A1jaros/alimentaci%C3%B3n/OC200710?source=navigation'},
]

async function buscarEnAmbosSupermercados(terminosConCategorias) {
    try {
        let terminoIndex = 0;
  
        if (fs.existsSync('busqueda_termino_alcampo')) {
            // Si el archivo existe, se lee el último término guardado
            const ultimoTermino = fs.readFileSync('busqueda_termino_alcampo', 'utf8');
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
          const {  termino } = terminosConCategorias[i];
          console.log(`Buscando término: ${termino}`);
      
          const resultadosDia = await buscarEnAlcampo(termino);
      
          // Insertar los resultados en la base de datos y esperar a que todas las inserciones se completen
          await insertarProductos(resultadosDia);
      
          // Se guarda el término actual
          fs.writeFileSync('busqueda_termino_alcampo', termino);
      
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
        // Iterar sobre cada producto y realizar la inserción en la base de datos
        for (const producto of productos) {
            // Verificar si las categorías y el término están definidos
            let marca = 'Alcampo';
            let frase = producto.nombre;
    let match = null
    if (/ALCAMPO/i.test(frase)) {
        frase = frase.replace(/ALCAMPO/i, "ALCAMPO");
      } 
   
        match = frase.match(/\b[A-Z]+\b/g);
      
      if (match !== null) {
        let palabrasMayusculas= match;
        palabrasMayusculas = palabrasMayusculas.map(palabra => palabra.trim());
        console.log(palabrasMayusculas); 
         marca = palabrasMayusculas.join(" ");
      }
      console.log(producto);
            // Construir la consulta SQL para insertar el producto
            const query = `INSERT INTO supermercado_alcampo (id_producto, nombre, imagen, precioNormal, precioOferta,
               CategoriaSuper1, CategoriaSuper2, CategoriaSuper3, marca, supermercado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            // Ejecutar la consulta SQL
            // Ejecutar la consulta SQL
                await db.execute(query, [
                    producto.idProducto,
                    producto.nombre,
                    producto.imagen,
                    producto.precioNormal,
                    producto.precioOferta,
                    producto.l1categoria,
                    producto.l2categoria,
                    producto.l3categoria,
                    marca.toLowerCase()?? '', // Utiliza el operador de fusión nula para proporcionar un valor predeterminado
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