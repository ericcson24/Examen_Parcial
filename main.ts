//importamos dependencias
import{MongoClient, ObjectId} from "mongodb"

//configuramos la url
const url=Deno.env.get("MONGO_URL")

if(!url){
    console.log("No funciona la url")
    Deno.exit(1)
}

const client= new MongoClient(url)

//conectamos al cliente

await client.connect()
console.log("Conectado")

const db=client.db("Bases_de_datos")
const personacollection = db.collection("contactos")

const handler = async (req:Request) : Promise<Response> => {
    
    //variables
    const url = new URL(req.url)
    const method = req.method
    const path = url.pathname
    const id = path.split("/")[2]

    //metodos get put post delete
    
    //hay que ahcer dos gets uno para correo y otro de personas
        //persona
        
        if (path===("/personas")&&method==="GET"){
           const nombre = url.searchParams.get("nombre")
           const personas = await personacollection.find(nombre? {nombre:{$regex: nombre, $options: "a"} } : {}).toArray()
            const result = await Promise.all(
                personas.map(async (persona)=>({
                ...persona,
                amigos: await personacollection.find({_id:{ $in: persona.amigos}})

            }
            ))
            )

           
           

        }
        //correo

         if (path.startsWith("/persona")&&method==="GET"){

            const email = url.searchParams.get("email")
            if(!email){
                return new Response(JSON.stringify({error:"Error no hay email"}))
            }
            
            const persona = await personacollection.findOne({email})
            if(!persona){
                return new Response(JSON.stringify({error:"Error no hay persona"}))
            }

            const amigos = await personacollection.find({id: {$in:persona.amigos}})
            if(!amigos){
                return new Response(JSON.stringify({...persona,amigos}))
            }

 
         }
        
        
        else if (path===("/personas")&&method==="POST"){
            try{
                const {email, nombre, telefono, amigos} = await req.json()
                //ver si esxisten ya
                const email_existente= await personacollection.findOne({email})
                const telefono_existente= await personacollection.findOne({telefono})

                //ambos existen
                if(email_existente||telefono_existente){
                    return new Response(JSON.stringify({error:"ya existe usurio con estos datos"}))
                }

                //meterlos
                const meter_el_Id= await personacollection.insertOne({
                    nombre,
                    email,
                    telefono,
                    amigos:amigos.map((id:string)=>new ObjectId(id))
                })
            


            }catch{
                return new Response(JSON.stringify({error: "Datos incorrectos"}),{status:400})

            }


        }else if(path===("/persona/amigo")&&method==="PUT"){
            try{
                const {persona_email,amigoid}= await req.json()
                const persona = await personacollection.findOne({email:persona_email})
                const amigo = await personacollection.findOne({_id: new ObjectId(amigoid)})

                if(!persona){
                    return new Response(JSON.stringify({error:"Falta persona"}))
                }
                if(!amigo){
                    return new Response(JSON.stringify({error:"Falta persona"}))
                }

                await personacollection.updateOne(
                    {email:persona_email},
                    {$addToSet:
                        {amigos: new ObjectId(amigoid)}
                    }
                )

            }catch{

            }

        }
        else if (path===("/persona")&&method==="PUT"){

            try{

                    const {email, nombre, telefono, amigos} = await req.json()

                    if(!email){
                        return new Response(JSON.stringify({error:"Falta email"}))
                    }

                    const persona = await personacollection.findOne({email})

                    if(!persona){
                    return new Response(JSON.stringify({error:"Error no hay persona"}))
                    }

                    await personacollection.updateOne(
                        {email},
                        {$set:
                            {nombre, telefono, amigos: amigos.map((id:string)=>new ObjectId(id))}
                        }
                    )



            }catch{
                return new Response(JSON.stringify({error: "Datos incorrectos"}),{status:400})
            }



        }
        else if(path===("/persona")&&method==="DELETE"){
            try{
                const {email} = await req.json()
                if(!email){
                    return new Response(JSON.stringify({error:"Falta email"}))
                }

                const borrar_count = await personacollection.deleteOne({email})
                if (borrar_count === 0) return new Response(JSON.stringify({error:"Usuario no encontrado"}))

                 return new Response(JSON.stringify({error:"Usuario eliminado"}))

                
                
            }catch{
                return new Response(JSON.stringify({error:"DAtos invalidos"}))

            }
        }



    




    //si no se accede a ningun metodo
    return new Response("Endpoint no encontrado",{status:400})
}

Deno.serve({ port: 3000 }, handler);