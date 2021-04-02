
const express = require('express')
const formidable = require('formidable')
const bodyParser = require('body-parser')
const { createClient, AuthType } = require("webdav");
var cors = require('cors')
const app = express()

const port = 3000
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

app.use(cors())

/*list directory items*/
app.get('/listFiles', (req, res) => {
  if(!req.query.path)
  res.status(400).send("Bad Request");
  const path = req.query.path;
    const client = createClient("http://dav.bee.resilientnet.com/",{
        //authType: AuthType.Digest,
        username:"gcarota",
        password:"bee"
    })

    const directoryItems = client.getDirectoryContents(path);
    directoryItems
        .then(e => res.send(e))
        .catch(e => res.send("Oh no! "+ e));
})


/*create a directory in a certain path*/
app.put('/makeDirectory', (req, res)=> {
  const client = createClient("http://dav.bee.resilientnet.com/",{
    //authType: AuthType.Digest,
    username:"gcarota",
    password:"bee"
})

  if(!req.body.dir_path)
    res.send("Bad Request").status(400);
  const dirName = req.body.dir_path;
  client.createDirectory(dirName)
  .then(e => res.status(200).send({response:"Directory sucessfully created"}))
  .catch(e => res.status(409).send("Oh no! Cannot create directory. Make sure the chosen path is right"+ e));
})

/*get a text file*/
app.get('/retrieveFile', (req, res) => {
  if(!req.query.filepath)
    res.status(400).send("Bad Request");
  const path = req.query.filepath;
    const client = createClient("http://dav.bee.resilientnet.com/",{
        //authType: AuthType.Digest,
        username:"gcarota",
        password:"bee"
    })

    const directoryItems = client.getFileContents(path);
    directoryItems
        .then(e => res.send(e))
        .catch(e => res.send("Oh no! "+ e));
})


/*upload a file*/
app.put('/uploadFile', (req, res) => {

  const form = new formidable.IncomingForm();
  form.parse(req, (error, fields, files) => {
    if(error){
      console.log(error)
    }
    
   /*get the list of submitted files*/
    var keys = Object.keys( files );
    for( var i = 0,length = keys.length; i < length; i++ ) {
    /*upload files to the selected path*/
      
      var element = files[keys[i]];
      console.log(element.name + " |" + element.path + " |" + element.size)
  }

    
  })
  /* const client = createClient("http://dav.bee.resilientnet.com/",{
    //authType: AuthType.Digest,
    username:"gcarota",
    password:"bee"
})

  if(!req.body.path)
    res.send("Bad Request").status(400);
  const dirName = req.body.path;
  console.log(dirName)
  const link = client.getFileUploadLink(dirName) */

  return res.status(200).send("ok")
})


+
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

