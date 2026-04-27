import app from "./app.js";

app.get("/", (_, res) => {
    res.status(200).send("Journalyst - Take Home Assignment");
});

app.listen(8080, () => {
    console.log("Express application is running successfully on port 8080");
});
