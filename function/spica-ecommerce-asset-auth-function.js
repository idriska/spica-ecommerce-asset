import * as Bucket from "@spica-devkit/bucket";
import * as Identity from "@spica-devkit/identity";

const SECRET_API_KEY = process.env.SECRET_API_KEY;
const USER_BUCKET = process.env.USER_BUCKET;

Bucket.initialize({ apikey: SECRET_API_KEY });
Identity.initialize({ apikey: SECRET_API_KEY });

export async function register(req, res) {
  let { user_data } = req.body;

  if (user_data.email && user_data.password) {
    let identity = await Identity.insert({
        identifier: user_data.email,
        password: user_data.password,
        policies: ["IdentityReadOnlyAccess", "BucketFullAccess"]
    }).catch(err => {
        console.log(err);
        return err;
    });

    if (identity._id) {
        let user = await Bucket.data.insert(USER_BUCKET, {
            ...user_data,
            identity_id: identity._id,

        }).catch((err) => console.log("ERROR ", err))
        return res.status(200).send({ message: "Registration successful", data: user._id });
    } else {
        return res.status(400).send({ message: identity.message });
    }
}
return res.status(400).send({ message: "Invalid email or password provided" });
}