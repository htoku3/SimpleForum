import { Board } from "./board.js"

window.main = function () {
    var board = new Board(null, null, {
        submit_url: "/forum/append_comment",
        user_name: null,
        disable_topics: true,
    })
    board.init_container(document.getElementById("board"))
}