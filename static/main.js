import { Board } from "./board.js"


const toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
    ['blockquote', 'code-block'],
    ['link', 'image', 'video', 'formula'],

    [{ 'header': 1 }, { 'header': 2 }],               // custom button values
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
    [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
    [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent

    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
    [{ 'font': [] }],
    [{ 'align': [] }],

    ['clean']                                         // remove formatting button
];


window.main = function () {
    var board = new Board(null, null, {
        submit_url: "/forum/append_comment",
        user_name: null,
        disable_topics: true,
        quill_settings: {
            modules: {
                syntax: true,
                toolbar: toolbarOptions
            },
            theme: 'snow'
        }
    })
    board.init_container(document.getElementById("board"))
}