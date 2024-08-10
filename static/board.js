
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

var ID = new global_id()

export class Board {
    static gen_id() {
        return "id-" + URL.createObjectURL(new Blob()).slice(-36)
    }

    /**
     * 
     * @param {HTMLElement} elem 
     */
    static cleanup(elem) {
        while (elem.firstChild) { elem.removeChild(elem.firstChild) }
    }

    /**
     * 
     * @param {Board} parent 
     * @param {object} init_data
     * @param {object} settings
     */
    constructor(parent, init_data, settings) {
        this.parent = parent
        this.data = init_data
        this.settings = settings
        this.is_null_node = !this.parent && settings?.disable_topics
        if (init_data) {
            this.children = init_data.children.map(data => new Board(this, data, settings))
        } else {
            this.children = []
        }
    }

    get_root() {
        let board = this
        while (board.parent) {
            board = board.parent
        }
        return board
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
        this.card_div.tabIndex = ID.get()
        this.card_div.classList.add("card", "row")
        this.card_div.addEventListener("focus", e => {
            this.get_root().close_reply_editor()
            if (!this.parent) return
            this.card_div.classList.add("border-primary")
            let header = this.card_div.querySelector(".card-header")
            if (header) {
                header.classList.remove("text-bg-secondary") 
                header.classList.add("text-bg-primary")
            }
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
            title_input.id = Board.gen_id()
            title_input_group.appendChild(title_span)
            title_input_group.appendChild(title_input)
            card_body.appendChild(title_input_group)

            let content_div = document.createElement("div")
            content_div.classList.add("content", "row", "mb-3")
            content_div.style.display = "none"
            card_body.appendChild(content_div)

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
        {
            if (!this.parent && !this.settings.user_name) {
                let uname_input_group = document.createElement("div")
                uname_input_group.classList.add("input-group", "uname-input-group")
                if (this.settings.user_name || this.parent) uname_input_group.style.display = "none"
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
            editor.id = Board.gen_id()
            this.editor_div.appendChild(editor)
            this.editor = new Quill(editor, { theme: 'snow' })
            this.editor.on("text-change", (delta, oldDelta, source) => this.set_button_status())


            let btn_comment = document.createElement("button")
            btn_comment.classList.add("btn", "btn-primary", "my-3")
            btn_comment.addEventListener("click", e => {
                this.exec_submit()
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
            this.show_initial()
        }

        if (!this.data && this.is_null_node) {
            fetch(this.settings.submit_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ writer: "", content: "" })
            })
                .then(response => response.json())
                .then(data => this.update_data(data))
        }
    }

    show_initial() {
        let card_head = this.card_div.querySelector(".card-header")
        Board.cleanup(card_head)
        let writer = document.createElement("span")
        writer.textContent = this.settings.user_name
        card_head.appendChild(writer)

        let card_body = this.card_div.querySelector(".card-body")
        card_body.querySelector(".title-input-group").style.removeProperty("display")
        card_body.querySelector(".content").style.display = "none"
        card_body.querySelector(".children").style.display = "none"
    }

    update_data(data) {
        this.data = data
        this.children = data.children.map(child_data =>
            new Board(this, child_data, this.settings))
        this.update_div()
    }

    update_div() {
        let card_head = this.card_div.querySelector(".card-header")
        if (card_head) {
            Board.cleanup(card_head)
            let writer = document.createElement("span")
            writer.textContent = this.data.writer
            let date = document.createElement("small")
            date.classList.add("mx-3")
            date.textContent = new Date(this.data.date).toLocaleDateString("ja-JP")
            card_head.appendChild(writer)
            card_head.appendChild(date)
            if (!this.parent && this.data.title) {
                card_head.appendChild(document.createElement("hr"))
                let title_span = document.createElement("div")
                title_span.textContent = this.data.title
                title_span.classList.add("h3", "me-5")
                card_head.appendChild(title_span)
            }
            this.card_div.querySelector(".title-input-group").style.display = "none"
        }

        let content = this.card_div.querySelector(".content")
        if (content) {
            content.style.removeProperty("display")
            content.innerHTML = this.data.content
        }

        let children_div = this.card_div.querySelector(".children")
        Board.cleanup(children_div)
        if (this.children.length > 0) {
            let hr = this.card_div.querySelector(".hr")
            if (hr) hr.style.removeProperty("display")
            this.children.forEach(board => board.init_container(children_div))
            children_div.style.removeProperty("display")
        } else {
            let hr = this.card_div.querySelector(".hr")
            if (hr) this.card_div.querySelector(".hr").style.display = "none"
            children_div.style.display = "none"
        }

        if (this.parent) {
            this.editor_div.style.display = "none"
        } else {
            this.editor_div.style.removeProperty("display")
        }
    }

    exec_submit() {
        let title = null
        let title_input = this.card_div.querySelector(".title-input-group")
        if (this.title_input && title_input.style.display != "none") {
            title = title_input.querySelector("input[type='text']").value
        }

        let writer = this.settings.user_name
        if (!writer) {
            let uname_input = this.get_root().card_div.querySelector(".uname-input-group")
            writer = uname_input.querySelector("input[type='text']").value
        }

        fetch(this.settings.submit_url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                parent_id: this.data?.id,
                writer: writer,
                content: this.editor.getSemanticHTML(),
                title: title
            })
        })
            .then(response => response.json())
            .then(data => {
                this.update_data(data)
            })
        this.editor.deleteText(0, this.editor.getLength())
    }
}
