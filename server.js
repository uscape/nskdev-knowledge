var express = require('express');
var mongodb = require('mongodb');

run = function(client) {
  var app = express.createServer();
  
  // app settings
  app.register( '.ejs', require('ejs') );
  app.use( express.static(__dirname + '/public') );
  app.use( express.bodyParser() );
  app.use( express.cookieParser() );
  app.use( app.router );
  
  // mongodb.Collection definition
  var knowledges = new mongodb.Collection(client, 'knowledges');

  // Top and Enter page
  app.get('/',function(req,res){
    res.header('Cache-Control','private');
    res.render('edit.ejs', { knowledge: null } );
  });

  // After entered
  app.post('/edited', function(req, res) {
    var knowledge = { summery: req.body.summery, problem: req.body.problem, solution: req.body.solution };
    knowledges.insert(knowledge, { safe: true }, function(err, objects) {
      if (err) { throw new Error(err); }
      res.redirect("/");
    });
  });

  // List page
  app.get('/list', function(req, res) {
    knowledges.find( {}, {} ).sort({_id:1}).limit(20).toArray(function(err, docs) {
      if (err) { throw new Error(err); }
      res.header('Cache-Control','private');
      res.render('list.ejs', { knowledges: docs } );
    });
  });

  // Detail page
  app.get('/detail/:id', function(req, res) {
    var id = new client.bson_serializer.ObjectID(req.params.id);
    knowledges.findOne( { _id: id }, function(err, doc) {
      if (err) { throw new Error(err); }
      res.header('Cache-Control','private');
      res.render('detail.ejs', { knowledge: doc } );
    });
  });
  
  // Edit from Detail page
  app.post('/edit/:id', function(req, res) {
    var id = new client.bson_serializer.ObjectID(req.params.id);
    knowledges.findOne( { _id: id }, function(err, doc) {
      if (err) { throw new Error(err); }
      res.header('Cache-Control','private');
      res.render('edit.ejs', { knowledge: doc } );
    });
  });

  // Edit from Detail page
  app.get('/edit', function(req, res) {
    res.header('Cache-Control','private');
    res.render('edit.ejs', { knowledge: null } );
  });
  
  // Delete from Detail page
  app.post('/delete/:id', function(req, res) {
    var id = new client.bson_serializer.ObjectID(req.params.id);
    knowledges.remove( { _id: id }, function(err, doc) {
      if (err) { throw new Error(err); }
      knowledges.find( {}, {} ).sort({_id:1}).limit(20).toArray(function(err, docs) {
        if (err) { throw new Error(err); }
        res.header('Cache-Control','private');
        res.render('list.ejs', { knowledges: docs } );
      });
    });
  });
  
  // Delete All (for Debug)
  app.get('/truncate', function(req, res) {
    knowledges.remove( {}, function(err, doc) {
      if (err) { throw new Error(err); }
      knowledges.find( {}, {} ).sort({_id:1}).limit(20).toArray(function(err, docs) {
        if (err) { throw new Error(err); }
        res.header('Cache-Control','private');
        res.render('list.ejs', { knowledges: docs } );
      });
    });
  });

  app.error(function(err,req,res,next){
    res.render('error.ejs', { err: err });
  });

  var port = process.env.VCAP_APP_PORT || process.env.PORT || 8001;
  app.listen(port);
  console.log('Server listing on port '+ port);

};

if ( process.env.VCAP_SERVICES ) {
  var service_type = "mongodb-1.8";
  var json = JSON.parse(process.env.VCAP_SERVICES);
  var credentials = json[service_type][0]["credentials"];
  var server = new mongodb.Server( credentials["host"], credentials["port"]);
  new mongodb.Db( credentials["db"], server, {} ).open( function(err,client) {
    client.authenticate( credentials["username"], credentials["password"], function(err,replies) { 
      run(client);
    });
  });
} else {
  var server = new mongodb.Server("127.0.0.1",27017,{});
  new mongodb.Db( "mongo_knowledge", server, {} ).open( function(err,client) {
    if ( err ) { throw err; }
    run(client);
  });
}



