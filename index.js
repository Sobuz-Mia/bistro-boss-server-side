const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
// bistroDB
// Jdd1zbRmsnRd48aX

app.use(cors());
app.use(express.json());

console.log(process.env.USER_NAME);
console.log(process.env.USER_PASS);
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.sbw5eqf.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    const menusCollection = client.db("bistroDB").collection("menus");
    const usersCollection = client.db("bistroDB").collection("users");
    const reviewsCollection = client.db("bistroDB").collection("reviews");
    const cartsCollection = client.db("bistroDB").collection("carts");

    // jwt token

    app.post("/jwt/token", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // middleware
    const verifyToken = (req, res, next) => {
      // console.log("varify token", req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized no token found" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized token error" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "Admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/users/admin", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden email not match" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "Admin";
      }
      res.send({ admin });
    });
    // handle all user api
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isExisting = await usersCollection.findOne(query);
      if (isExisting) {
        return res.send({ message: "user already exist" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "Admin",
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    // all menus api
    app.get("/menus", async (req, res) => {
      const result = await menusCollection.find().toArray();
      res.send(result);
    });
    app.get('/menu/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await menusCollection.findOne(query);
      res.send(result);
    })
    app.post("/addItem", async (req, res) => {
      const item = req.body;
      const result = await menusCollection.insertOne(item);
      res.send(result);
    });

    app.patch('/menu/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)}
      const item = req.body;
      const updateDoc = {
        $set :{
          category:item.category,
          image:item.image,
          name:item.name,
          price:item.price,
          recipe:item.recipe
        }
      }
      const result = await menusCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

    app.delete("/menus/:id",verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id)};
      console.log(query);
      const result = await menusCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });
    // carts get method
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = {
        userEmail: email,
      };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });
    // carts post method
    app.post("/carts", async (req, res) => {
      const cartData = req.body;
      const result = await cartsCollection.insertOne(cartData);
      res.send(result);
    });
    app.delete("/cart/item/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Bistro server is running");
});

app.listen(port, () => {
  console.log(`Bistro boss server listing on port ${port}`);
});
