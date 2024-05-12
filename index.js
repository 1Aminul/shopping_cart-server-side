const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const SSLCommerzPayment = require('sslcommerz-lts')
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

const store_id = process.env.STORE_ID
const store_passwd = process.env.STORE_PASSWORD
const is_live = false //true for live, false for sandbox


app.use(cors())
app.use(express.json())
app.use(express.static("public"));





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kadm9uq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const categoryItemCollection = client.db('shopping_cart').collection('categoryItem');
        const wishListItemCollection = client.db('shopping_cart').collection('wishList');
        const cartItemCollection = client.db('shopping_cart').collection('cart');
        const orderCollection = client.db('shopping_cart').collection('order');


        app.get('/product', async(req, res)=>{
            const query = {};
            const product = await categoryItemCollection.find(query).toArray();
            res.send(product);
        })
        app.get('/displayProduct', async(req, res)=>{
            const query = {};
            const product = await categoryItemCollection.find(query).toArray();
            const items = product.map(prod=> prod.categoryItem)
            res.send(items);
        })
       
        
        app.get('/product/:id', async(req, res)=>{
            const id = req.params.id
            const query = {_id: new ObjectId(id)}
            const result = await categoryItemCollection.findOne(query)   
            res.send(result)
        })
        app.get('/cart/:productId/:itemID', async(req, res)=>{
            const id = req.params.productId
            const Id = req.params.itemID
            const query = {_id: new ObjectId(id)}
            const products = await categoryItemCollection.findOne(query)
            const items = products.categoryItem.find((item)=> item.id == Id)
            res.send(items)
            
        })

        app.post('/wishlist', async (req, res)=>{
            const wishlist = req.body;
            const result = await wishListItemCollection.insertOne(wishlist);
            res.send(result)
        })
        app.get('/wishlist', async(req, res)=>{
            const email = req.query.email
            const query = {user: email};
            const result = await wishListItemCollection.find(query).toArray()
            res.send(result)
        })
        app.delete('/wishlist/:id', async(req, res)=>{
            const id = req.params.id
            const query = {_id: new ObjectId(id) }
            const result = await wishListItemCollection.deleteOne(query)
            res.send(result)
        })
        app.delete('/wishlist', async(req, res)=>{
            const email = req.query.email
            const query = {user: email}
            console.log(email)
            const result = await wishListItemCollection.deleteMany(query)
            res.send(result)
        })

        app.post('/cart', async(req, res)=>{
            const cart = req.body
            const result = await cartItemCollection.insertOne(cart);
            res.send(result)
        })
        app.get('/cart', async(req, res)=> {
            const email = req.query.email
            const query = {user: email}
            const result = await cartItemCollection.find(query).toArray();
            res.send(result)
        })
        app.delete('/cart', async(req, res)=> {
            const email = req.query.email
            const query = {user: email}
            const result = await cartItemCollection.deleteMany(query)
            res.send(result)
        })
        app.delete('/cart/:id', async(req, res)=> {
            const id = req.params.id
            const query= {_id: new ObjectId(id)}
            const result = await cartItemCollection.deleteOne(query)
            res.send(result)
        })


        app.post('/orders', async (req, res) => {
            const product = req.body

            console.log(product)
            const transactionId = new ObjectId().toString()
            const data = {
                total_amount: product.amount,
                currency: product.currency,
                tran_id:transactionId , // use unique tran_id for each api call
                success_url: `https://food-fanda-server2.vercel.app/payment/success?transactionId=${transactionId}`,
                fail_url: 'http://localhost:3030/fail',
                cancel_url: 'http://localhost:3030/cancel',
                ipn_url: 'http://localhost:3030/ipn',
                shipping_method: 'Courier',
                product_name: 'Computer.',
                product_category: 'Electronic',
                product_profile: 'general',
                cus_name: product.name,
                cus_email: product.email,
                cus_add1: product.address,
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: product.postCode,
                cus_country: 'Bangladesh',
                cus_phone: '01711111111',
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
            };
            console.log(data)
            // res.send(data)
            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
            sslcz.init(data).then(apiResponse => {
                // Redirect the user to payment gateway
                let GatewayPageURL = apiResponse.GatewayPageURL
                console.log(GatewayPageURL)
                orderCollection.insertOne({
                    ...product,
                    price: product.amount,
                    transactionId,
                    paid: false,
                })
                res.send({url: GatewayPageURL})
                console.log('Redirecting to: ', GatewayPageURL)
            });
        })

        app.post('/payment/success', async(req, res)=>{
            console.log("success")
            const {transactionId} = req.query;
            const result = await orderCollection.updateOne( {transactionId}, 
                {$set:{paid:true, paidAt: new Date()} });
                console.log(result)
            if(result.modifiedCount > 0){
                res.redirect(`http://localhost:3000/payment/success?transactionId=${transactionId}`)
            }
        })

        app.get('/payment/transaction/:id', async(req, res)=> {
            const id = req.params.id;
            const query = {transactionId: id}
            const result = await orderCollection.find(query).toArray()
            res.send(result)

        })




    }
    finally{

    }
}
run().catch(err => console.error(err))

app.get('/', (req, res)=>{
    res.send('hello node js')
})

app.listen(port, ()=>{
    console.log(`server is running ${port}`)
})

