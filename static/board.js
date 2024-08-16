
class global_id {
    constructor() {
        this.id = 0
    }

    get() {
        let id = this.id
        this.id = this.id + 1
        return id
    }
}

export function BoardHeader(data) {
    let fragment = document.createDocumentFragment()
    let writer = document.createElement("span")
    writer.textContent = data.writer
    let date = document.createElement("small")
    date.classList.add("mx-3")

    const written_date = new Date(data.date)
    const now = new Date();
    const diffMs = now - written_date; // 差分をミリ秒で計算
    const diffSec = Math.floor(diffMs / 1000); // 秒
    const diffMin = Math.floor(diffSec / 60); // 分
    const diffHrs = Math.floor(diffMin / 60); // 時間
    const diffDays = Math.floor(diffHrs / 24); // 日

    if (diffDays > 0) {
        date.textContent = written_date.toLocaleString("ja-JP")
    } else if (diffHrs > 0) {
        date.textContent = `${diffHrs}時間${diffMin % 60}分前`;
    } else if (diffMin > 0) {
        date.textContent = `${diffMin}分${diffSec % 60}秒前`;
    } else {
        date.textContent = `${diffSec}秒前`;
    }

    fragment.appendChild(writer)
    fragment.appendChild(date)

    return fragment
}


export function TopicsTitle(data) {
    let fragment = document.createDocumentFragment()
    let title_span = document.createElement("div")
    title_span.classList.add("card-title", "h2")
    title_span.textContent = data.title
    fragment.appendChild(title_span)
    return fragment
}

var tabIndexMaker = new global_id()

export default class Board {
    /**
     * 
     * @param {HTMLElement} elem 
     */
    static cleanup(elem) {
        while (elem.firstChild) { elem.removeChild(elem.firstChild) }
    }

    /**
     * 
     * @param {object} init_data
     * @param {object} settings
     * @param {Board} parent 
     */
    constructor(init_data, settings, parent = null) {
        this.parent = parent
        if (typeof init_data === "number") {
            this.data = { id: init_data, children: [], writer: "", content: "" }
        } else {
            this.data = init_data
        }

        this.settings = settings
        this.is_null_node = !this.parent && settings?.disable_topics
        if (!this.settings.quill_settings) {
            this.settings.quill_settings = { theme: 'snow', modules: { toolbar: true } }
        }

        // Create an empty root node if there are no topics at the root node
        if (!this.data && this.is_null_node) {
            this.data = {
                writer: "",
                title: null,
                content: "",
                date: "",
                children: [],
            }
        }

        this.children = []
        if (typeof init_data === "number") {
            this.update_data()
        } else if (init_data) {
            this.children = init_data.children.map(data => new Board(data, settings, this))
        }
    }

    get user_name() {
        if (!this.settings.user_name) {
            let uname_input = this.root.card_div.querySelector(".uname-input-group")
            return uname_input.querySelector("input[type='text']").value
        }
        if (typeof this.settings.user_name === "string") return this.settings.user_name
        return this.settings.user_name.value
    }

    get root() {
        let board = this
        while (board.parent) {
            board = board.parent
        }
        return board
    }

    get is_edit_mode() {
        if (!this.content) return false
        return this.content.root.getAttribute('contenteditable') === 'true'
    }

    set is_edit_mode(value) {
        if (value) {
            this.content.enable(true)
            let toolbar = this.content.getModule('toolbar')
            toolbar.container.style.removeProperty("display")
            this.close_reply_editor()
        } else {
            let toolbar = this.content.getModule('toolbar')
            toolbar.container.style.display = "none"
            this.content.enable(false)
        }
    }

    close_reply_editor() {
        if (this.parent) {
            this.editor_div.style.display = "none"
        }
        this.card_div.classList.remove("border-primary")
        this.card_div.classList.add("border-secondary")
        let header = this.card_div.querySelector(".card-header")
        if (header) {
            header.classList.remove("text-bg-primary")
            header.classList.add("text-bg-secondary")
        }

        this.children.forEach(element => {
            element.close_reply_editor()
        });
    }

    set_button_status() {
        this.button.disabled = (this.editor.getText().trim() === "")
        this.button.disabled |= this.user_name == ""

        let title_input = this.card_div.querySelector(".title-input-group")
        if (title_input && title_input.style.display != "none") {
            this.button.disabled |= title_input.querySelector("input[type='text']").value.trim() === ""
        }

        let uname_input = this.card_div.querySelector(".uname-input-group")
        if (uname_input) {
            this.button.disabled |= uname_input.querySelector("input[type='text']").value.trim() === ""
        }
    }

    init_container(root_container) {
        this.div = document.createElement("div")
        this.div.classList.add("row", "my-2")
        let div_col = document.createElement("div")
        div_col.classList.add("col")

        this.card_div = document.createElement("div")
        this.card_div.tabIndex = tabIndexMaker.get()
        this.card_div.classList.add("card", "row")
        this.card_div.addEventListener("focus", e => {
            // Update data before showing edit area.
            this.update_data()
            this.root.close_reply_editor()
            this.card_div.classList.add("border-primary")
            let header = this.card_div.querySelector(".card-header")
            if (header) {
                header.classList.remove("text-bg-secondary")
                header.classList.add("text-bg-primary")
            }
            if (!this.parent) return
            this.editor_div.style.removeProperty("display")
        })

        if (!this.is_null_node) {
            let card_head = document.createElement("div")
            card_head.classList.add("card-header", "text-bg-secondary")
            this.card_div.appendChild(card_head)
        }

        let card_body = document.createElement("div")
        card_body.classList.add("card-body")

        if (!this.is_null_node) {
            let title_input_group = document.createElement("div")
            title_input_group.classList.add("input-group", "title-input-group")
            title_input_group.style.display = "none"
            let title_span = document.createElement("span")
            title_span.classList.add("input-group-text", "form-control-lg")
            title_span.textContent = "Title"
            card_body.appendChild(title_span)
            let title_input = document.createElement("input")
            title_input.addEventListener("change", e => this.set_button_status())
            title_input.classList.add("form-control", "form-control-lg")
            title_input.type = "text"
            title_input_group.appendChild(title_span)
            title_input_group.appendChild(title_input)
            card_body.appendChild(title_input_group)

            let title_div = document.createElement("div")
            title_div.classList.add("topics-title", "row", "mb-3")
            title_div.style.display = "none"
            card_body.appendChild(title_div)

            let content_div = document.createElement("div")
            content_div.classList.add("content", "row", "mb-3")
            content_div.style.display = "none"
            card_body.appendChild(content_div)
            this.content = new Quill(content_div, this.settings.quill_settings)
            this.is_edit_mode = false

            let hr = document.createElement("div")
            hr.classList.add("hr", "border-secondary", "border-bottom", "border-3")
            hr.style.display = "none"
            card_body.appendChild(hr)
        }

        let children_div = document.createElement("div")
        children_div.classList.add("children", "row", "border-secondary", "border-3")
        if (this.parent) {
            children_div.classList.add("ms-3", "ps-3", "border-start")
        } else {
            if (!this.is_null_node)
                children_div.classList.add("mx-2", "px-2")
        }
        children_div.style.display = "none"
        card_body.appendChild(children_div)

        this.editor_div = document.createElement("div")
        this.editor_div.classList.add("row", "my-3")
        if (this.parent) this.editor_div.style.display = "none"
        {
            if (!this.parent && !this.settings.user_name) {
                let uname_input_group = document.createElement("div")
                uname_input_group.classList.add("input-group", "uname-input-group")
                let uname_span = document.createElement("span")
                uname_span.classList.add("uname-group-text", "form-label", "form-control-sm")
                uname_span.textContent = "Your name"
                card_body.appendChild(uname_span)
                let uname_input = document.createElement("input")
                uname_input.addEventListener("change", e => { this.set_button_status() })
                uname_input.classList.add("form-control", "form-control-sm")
                uname_input.type = "text"
                uname_input_group.appendChild(uname_span)
                uname_input_group.appendChild(uname_input)
                this.editor_div.appendChild(uname_input_group)
            }

            let editor = document.createElement("div")
            this.editor_div.appendChild(editor)
            this.editor = new Quill(editor, this.settings.quill_settings)
            this.editor.on("text-change", (delta, oldDelta, source) => this.set_button_status())


            let btn_comment = document.createElement("button")
            btn_comment.classList.add("btn", "btn-primary", "my-3")
            btn_comment.addEventListener("click", e => {
                if (this.is_null_node && !this.data.id) {
                    fetch(this.settings.submit_url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            writer: this.user_name,
                            content: "",
                            plain_text: "",
                            submit_params: this.settings.submit_params,
                        })
                    })
                        .then(response => response.json())
                        .then(root_data => {
                            this.data = root_data
                            this.exec_submit()
                        })
                } else {
                    this.exec_submit()
                }
            })
            btn_comment.textContent = this.parent ? "Reply" : "Comment"
            btn_comment.disabled = true
            this.button = btn_comment
            this.editor_div.appendChild(btn_comment)
        }
        card_body.appendChild(this.editor_div)

        this.card_div.appendChild(card_body)

        div_col.appendChild(this.card_div)
        this.div.appendChild(div_col)
        root_container.appendChild(this.div)

        if (this.data || this.is_null_node) {
            this.update_div()
        } else {
            this.show_make_topics()
        }
    }

    show_make_topics() {
        let card_head = this.card_div.querySelector(".card-header")
        Board.cleanup(card_head)
        let writer = document.createElement("span")
        writer.textContent = this.user_name
        card_head.appendChild(writer)

        let card_body = this.card_div.querySelector(".card-body")
        card_body.querySelector(".title-input-group").style.removeProperty("display")
        card_body.querySelector(".content").style.display = "none"
        card_body.querySelector(".children").style.display = "none"
    }

    update_data(data) {
        if (!data) {
            if (!this.data.id) return
            fetch(this.settings.get_data_url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ id: this.data.id })
            })
                .then(response => response.json())
                .then(data => {
                    this.data = data
                    this.children = data.children.map(child_data =>
                        new Board(child_data, this.settings, this))
                    this.update_div()
                })
            return
        }

        this.data = data
        this.children = data.children.map(child_data =>
            new Board(child_data, this.settings, this))
        this.update_div()
    }

    make_edit_button() {
        let edit_button_group = document.createElement("div")
        edit_button_group.classList.add("form-group")

        if (this.is_edit_mode) {
            let save_button = document.createElement("button")
            save_button.classList.add("btn", "btn-danger", "btn-sm", "me-2")
            save_button.textContent = "Save"
            edit_button_group.appendChild(save_button)
            let cancel_button = document.createElement("button")
            cancel_button.classList.add("btn", "btn-warning", "btn-sm")
            cancel_button.textContent = "Cancel"
            edit_button_group.appendChild(cancel_button)

            save_button.addEventListener("click", e => {
                this.is_edit_mode = false
                fetch(this.settings.edit_url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        id: this.data.id,
                        content: this.content.root.innerHTML,
                        plain_text: this.content.root.innerText,
                    })
                })
                    .then(response => response.json())
                    .then(new_comment => {
                        if (!this.data) {
                            this.update_data(new_comment)
                        } else {
                            this.update_data()
                        }
                    })
            })

            cancel_button.addEventListener("click", e => {
                this.is_edit_mode = false
                this.update_div()
            })
        } else {
            let edit_button = document.createElement("button")
            edit_button.classList.add("btn", "btn-danger", "btn-sm")
            edit_button.textContent = "Edit"
            edit_button_group.appendChild(edit_button)
            edit_button.addEventListener("click", e => {
                this.is_edit_mode = true
                this.update_div()
            })
        }
        return edit_button_group
    }

    update_div() {
        let card_head = this.card_div.querySelector(":scope > .card-header")
        if (card_head) {
            Board.cleanup(card_head)
            let header_row = document.createElement("div")
            header_row.classList.add("d-flex")
            let header_content = document.createElement("div")
            header_content.classList.add("me-auto")
            header_content.appendChild(BoardHeader(this.data))
            header_row.appendChild(header_content)

            header_row.appendChild(this.make_edit_button())
            card_head.appendChild(header_row)
            this.card_div.querySelector(".title-input-group").style.display = "none"
        }

        let title = this.card_div.querySelector(":scope > .card-body > .topics-title")
        if (title && this.data.title) {
            Board.cleanup(title)
            title.style.removeProperty("display")
            title.appendChild(TopicsTitle(this.data))
        }

        let content = this.card_div.querySelector(":scope > .card-body > .content")
        if (content) {
            content.style.removeProperty("display")
            //content.innerHTML = this.data.content
            if (!this.is_edit_mode) this.content.clipboard.dangerouslyPasteHTML(this.data.content)
        }

        let children_div = this.card_div.querySelector(":scope > .card-body > .children")
        Board.cleanup(children_div)
        if (this.children.length > 0) {
            let hr = this.card_div.querySelector(".hr")
            if (hr) hr.style.removeProperty("display")
            let fragment = document.createDocumentFragment()
            this.children.forEach(board => board.init_container(fragment))
            children_div.appendChild(fragment)
            children_div.style.removeProperty("display")
        } else {
            let hr = this.card_div.querySelector(".hr")
            if (hr) this.card_div.querySelector(".hr").style.display = "none"
            children_div.style.display = "none"
        }
    }

    exec_submit() {
        let title_input = this.card_div.querySelector(".title-input-group")
        let title = undefined
        if (title_input && title_input.style.display != "none") {
            title = title_input.querySelector("input[type='text']").value
        }

        fetch(this.settings.submit_url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                parent_id: this.data?.id,
                writer: this.user_name,
                content: this.editor.root.innerHTML,
                plain_text: this.editor.root.innerText,
                title: title,
                submit_params: this.settings.submit_params,
            })
        })
            .then(response => response.json())
            .then(new_comment => {
                if (!this.data) {
                    this.update_data(new_comment)
                } else {
                    this.update_data()
                }
            })
        this.editor.deleteText(0, this.editor.getLength())
    }
}
