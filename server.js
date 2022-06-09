/**
 * Created By: Meshal Alenzi
 * Date: 04/08/2021
 */

const express = require('express')
const formidable = require('formidable');
const fs = require('fs');
const { Buffer } = require('buffer');
const cors = require("cors");
const { proccessGeneratePostmanColl , proccessGenerateOpenApi, getProxyEndpoints} = require('./component/apiUtilities.js');
const { proccessUploadedFile } = require('./component/swagger.js');
const convert = require('xml-js');
const xmlparser = require('express-xml-bodyparser');
const router = express.Router();

const DOWNLOAD_PATH = require('./Configuration.json').DOWNLOAD_PATH;
const app = express()
const port = 9090
app.use(cors());
app.use(xmlparser());
app.use('/apigeneration',router)

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));
// Parse JSON bodies (as sent by API clients)
app.use(express.json({limit: '50mb'}));

router.post('/apiproxy', async function(req, res) {
    var form = new formidable.IncomingForm();
    proccessUploadedFile(req, form)
    .then((response)=> {
        res.status(201);
        res.send(response);
    })
    .catch(error => {
        res.status(400);
        console.log(error.message);
        res.send(error);
    });
});

router.get('/apiproxy/:orgName/:proxyName', function(req, res) {
    getProxyEndpoints(req.params.proxyName, req.params.orgName)
    .then((response) => res.send(response))
    .catch((err) => res.send(err.message));
});


router.get('/postmancollections/:orgName/:proxyName' , (req , res)=>{
    console.log(req.params.proxyName);
    proccessGeneratePostmanColl(req.params.proxyName, req.params.orgName)
    .then((response) => res.send(response))
    .catch((err) => res.send(err.message));

});

router.get('/openapi/:orgName/:proxyName' , (req , res)=>{
    proccessGenerateOpenApi(req.params.proxyName, req.params.orgName)
    .then((response) => res.send(response))
    .catch((err) => res.send(err.message));

});


router.post('/convertXml2Json' , xmlparser({trim: false, explicitArray: false}), (req , res)=>{
    try
    {
        res.send(JSON.parse(convert.xml2json(req.rawBody,{compact: true, spaces: 4, ignoreDeclaration: true})));
    }
    catch(err)
    {
        res.send(err);
    }
});

router.get('/', (req, res) => {
    res.redirect('https://github.com/MeshalEnzi');
});

app.get('*', function(req, res){
    res.status(404);
    if (req.accepts('html')) 
    {
        res.send("404: Not Found!");
        return;
    }
    if (req.accepts('json')) 
    {
        res.json({ error: 'Not found' });
        return;
    }
    res.type('txt').send('Not found');
});

app.listen(port, () => {
    console.log(`Generation app listening at http://localhost:${port}`);
    if( !fs.existsSync(DOWNLOAD_PATH) ){
        fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
    }
});