import { Board } from "./board.js"

window.main = function () {
    var board = new Board(null, null, "foo bar", event => {
        fetch("/forum/append_comment", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(event.comment)
        })
            .then(response => response.json())
            .then(data => {
                event.board.update_data(data)
            })
    })

    board.init_container(document.getElementById("board"))
}