import { Router } from "express";
import { identifyContactDetails } from "../controllers/contact";

const router: Router  = Router();

router.post("/identify", identifyContactDetails);


export default router;