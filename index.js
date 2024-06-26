const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookie = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();
app.use(cookie())

// middlewares
app.use(express.json());
app.use(
	cors({
		origin: ["http://localhost:5173"],
		credentials: true,
	})
);
// costom middlewares 
const loggerMiddleWare = (req, res, next) => {
	console.log('Called my coustom middleware => ', req.hostname, req.originalUrl)
}

const verifyToken =  (req, res, next) => {
	const token = req.cookies?.token;
	console.log("Value of token is :", "(", token, ")");
	if (!token) {
		return res.status(401).send({message:'Not Authorized'})
	}
	jwt.verify(token, process.env.ACCESS_TOKEN_JWT, (error, decoded) => {
		if (error) {
			console.log(error)
			return res.status(401).send("Unauthorized")
		}
		console.log(decoded)
		req.user = decoded
		next()
	})
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s3py8lp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
		await client.connect();
		// Send a ping to confirm a successful connection

		const database = client.db("car-doc");
		const servicesColloction = database.collection("services");
		const orederColloction = database.collection("orders");

		// Authorization Part with jwt
		app.post('/jwt', async (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_TOKEN_JWT, { expiresIn: '1h' })
			res
				.cookie('token', token, {
					httpOnly: true,
					secure: false,
					sameSite:false
				})

				// .cookie('tokens', token, {
				// 	httpOnly: true,
				// 	secure: false,
				// 	sameSite:'none'
				// })
				.send({success:true})
		})

		// Services Part
		app.post("/orders", async (req, res) => {
			const order = req.body;
			const result = await orederColloction.insertOne(order);
			res.send(result);
		});

		app.get("/orders",verifyToken, async (req, res) => {
			let quary = {};
			console.log(req.user)
			if (req.query.email) {
				quary = { email: req.query.email };
			}
			const result = await orederColloction.find(quary).toArray();
			res.send(result);
		});

		app.get("/", (req, res) => {
			res.send("Hello This is car doctore server");
		});

		app.get("/services",async (req, res) => {
			const services = servicesColloction.find();
			console.log('Token :', req.cookies.token)
			const result = await services.toArray();
			res.send(result);
		}); 

		app.get("/services/:id", async (req, res) => {
			const id = req.params.id;
			const quary = { _id: new ObjectId(id) };
			const options = {
				projection: { title: 1, price: 1, img: 1 },
			};
			const result = await servicesColloction.findOne(quary, options);
			res.send(result);
		});

		app.delete("/orders/:id", async (req, res) => {
			const id = req.params.id;
			const quary = { _id: new ObjectId(id) };
			const result = await orederColloction.deleteOne(quary);
			res.send(result);
		});

		app.patch("/orders/:id", async (req, res) => {
			const id = req.params.id;
			const updatedOrder = req.body;
			const quary = { _id: new ObjectId(id) };
			const updatedDoc = {
				$set: {
					status: updatedOrder.status,
				},
			};
			const result = await orederColloction.updateOne(quary, updatedDoc);
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

app.get("/", (req, res) => res.send("cardoctor is running"));

app.listen(port, () =>
	console.log("The car doctore server is running in port:", port)
);
