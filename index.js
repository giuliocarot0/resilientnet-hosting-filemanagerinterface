
const express = require('express')
const fs = require("fs")
const mime = require("mime")
const path = require('path');
const keycloak = require('keycloak-backend')({
  "realm": "resilientnetidp",
  "auth-server-url": "https://idp.resilientnet.com/",
  "ssl-required": "external",
  "resource": "filemanager-backend",
  "public-client": true,
  "confidential-port": 0
})
const formidable = require('formidable')
const cookies = require('cookie-parser')
const bodyParser = require('body-parser')
const { createClient, AuthType } = require("webdav");
var cors = require('cors');
const { send } = require('process');
const app = express()

const port = 3000
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())


app.use(cors())
app.use(cookies())
/*creating a middleware that creates a connection to the webdav instance*/
app.use(function (req, res, next) {
  /*receive a token: if keycloak one validate and set a cookie with jwt for this session*/
  console.log(req.cookies)
  if(req.cookies && req.cookies.K_IDENTITY){

        let k_payload = req.cookies.K_IDENTITY;
        let k_token = keycloak.accessToken.info(k_payload)
        k_token
          .then((e) => {
              /*The middleware should read the token and understand which is the target website plus the credentials*/
              const user = "gcarota"
              const pass = "bee"
              const host = "http://dav.bee.resilientnet.com/"
              const client = createClient(host,{
                //authType: AuthType.Digest,
                username:user,
                password:pass
              })
              res.locals.client = client
              res.locals.subject = e["preferred_username"]
              return next();
            })
          .catch(() =>{
              return next();
            })
        }
  else
   return res.redirect('https://idp.resilientnet.com/auth/realms/resilientnetidp/protocol/openid-connect/auth?client_id=filemanager-backend&response_mode=fragment&response_type=code&redirect_uri=http://localhost:3000/');
})



app.get('/', (req,res) => {
  if(res.locals.client && res.locals.subject) 
    res.send("Hello! "+res.locals.subject);
  else
    res.status(401).send({error: "Unauthorized"})
})

/*list directory items*/
app.get('/list', (req, res) => {
  if(!req.query.path)
  res.status(400).send("Bad Request");
  const path = req.query.path
  const client = res.locals.client  

    const directoryItems = client.getDirectoryContents(path);
    directoryItems
        .then(e => res.send(e))
        .catch(e => res.send("Oh no! "+ e));
})

/*move a file*/
app.post('/move/',(req, res) => {
  /*put in a post body source and destination path*/
  if(!req.body.src_path || !req.body.dst_path){
    res.status(400).send("Bad Request")
  }
  const src = req.body.src_path
  const dst = req.body.dst_path

  const client = res.locals.client

  client.copyFile(src, dst)
    .then(e => { 
      client.deleteFile(src).then(res.send("File moved")).catch(a=>{ res.status(500).send("Server Error, try to rollback")})
    })
    .catch(e=>{res.status(500).send("Cannot move the file, due to the following error: "+e)})
})

/*copy a file*/
app.post('/copy',(req, res) => {
  /*put in a post body source and destination path*/
  if(!req.body.src_path || !req.body.dst_path){
    res.status(400).send("Bad Request")
  }
  const src = req.body.src_path
  const dst = req.body.dst_path

  const client = res.locals.client

  client.copyFile(src, dst)
    .then(e => { 
      res.send("File copied")
    })
    .catch(e=>{res.status(500).send("Cannot copy the file, due to the following error: "+e)})
})


/*delete a file*/
app.delete('/delete',(req, res) => {
  /*put in a post body source and destination path*/
  if(!req.body.path){
    res.status(400).send("Bad Request")
  }
  const path = req.body.path

  const client = res.locals.client

  client.deleteFile(path)
    .then(e => { 
      res.send("File deleted")
    })
    .catch(e=>{res.status(500).send("Cannot delete the file, due to the following error: "+e)})
})

/*create a directory in a certain path*/
app.put('/makedir', (req, res)=> {
  const client = res.locals.client  


  if(!req.body.dir_path)
    res.send("Bad Request").status(400);
  const dirName = req.body.dir_path;
  client.createDirectory(dirName)
  .then(e => res.status(200).send({response:"Directory sucessfully created"}))
  .catch(e => res.status(409).send("Oh no! Cannot create directory. Make sure the chosen path is right"+ e));
})

/*get a text file*/
app.get('/download', (req, res) => {
  if(!req.query.filepath)
    res.status(400).send("Bad Request");
  const fpath = req.query.filepath;
  const client = res.locals.client  

  const name = client.id + "_" +path.basename(fpath);
  client.createReadStream(fpath).pipe(fs.createWriteStream("/tmp/" + name));
  const type = mime.lookup("/tmp/" + name)
  res.setHeader('Content-disposition', 'attachment; filename=' + name);
  res.setHeader('Content-type', type);
  var readStream = fs.createReadStream("/tmp/" + name);
  readStream.on('open', function () {
    // This just pipes the read stream to the response object (which goes to the client)
    readStream.pipe(res);
  });
})


/*upload a file*/
app.put('/upload', (req, res) => {
  const client = res.locals.client
  const form = new formidable.IncomingForm();
  form.parse(req, (error, fields, files) => {
    if(error){
      console.log(error)
    }
    const path = fields.path;
    console.log(path)
   /*get the list of submitted files*/
    var keys = Object.keys( files );
    for( var i = 0,length = keys.length; i < length; i++ ) {
    /*upload files to the selected path*/
      
      var element = files[keys[i]];
      console.log(element.name + " |" + element.path + " |" + element.size)
      fs.createReadStream(element.path).pipe(client.createWriteStream(path + "/"+element.name))
  }
  })
  return res.status(200).send("ok")
})



app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

