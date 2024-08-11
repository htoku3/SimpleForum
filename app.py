from datetime import datetime
from typing import Optional, List
from flask import Flask
from flask import render_template, jsonify, request, abort

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite://"
db.init_app(app)


class Board(db.Model):
    __tablename__ = "board"
    id: Mapped[int] = mapped_column(primary_key=True)
    writer: Mapped[str] = mapped_column(nullable=False)
    date: Mapped[datetime] = mapped_column(nullable=False)
    content: Mapped[str] = mapped_column(nullable=False)
    plain_text: Mapped[str] = mapped_column(nullable=False)
    title: Mapped[str] = mapped_column(nullable=True)

    parent_id: Mapped[int] = mapped_column(db.ForeignKey("board.id"), nullable=True)
    parent: Mapped[Optional["Board"]] = relationship("Board", remote_side=[id])

    children: Mapped[List["Board"]] = relationship("Board", back_populates="parent")

    def to_dict(self, contain_children=True):
        data = dict()
        data["id"] = self.id
        data["writer"] = self.writer
        data["date"] = self.date
        data["content"] = self.content
        data["parent_id"] = self.parent_id
        if contain_children:
            data["children"] = list(map(lambda child: child.to_dict(), self.children))
        data["title"] = self.title

        return data


@app.route("/")
@app.route("/sample1")
def sample1():
    return render_template("sample1.html")


@app.route("/sample2")
def sample2():
    return render_template("sample2.html")


@app.route("/sample3")
def sample3():
    return render_template("sample3.html")


@app.route("/forum/get_topics", methods=["POST"])
def get_topics():
    query = db.select(Board).filter(Board.title != None)
    topics: List[Board] = db.session.execute(query).scalars().all()
    return jsonify([t.to_dict(contain_children=False) for t in topics])


@app.route("/forum/get_data", methods=["POST"])
def get_forum_data():
    data = request.get_json()
    if not "id" in data:
        return abort(505)
    data: Board = db.session.get(Board, int(data["id"]))
    return jsonify(data.to_dict())


@app.route("/forum/append_comment", methods=["POST"])
def append_comment():
    data = request.get_json()
    parent: Optional[Board]
    if "parent_id" not in data:
        parent = None
    else:
        parent = db.session.get(Board, int(data["parent_id"]))

    title = None
    if "title" in data:
        title = data["title"]

    new_board = Board(
        writer=data["writer"],
        date=datetime.now(),
        content=data["content"],
        plain_text=data["plain_text"],
        parent=parent,
        title=title,
    )
    db.session.add(new_board)

    if parent:
        parent.children.append(new_board)
    db.session.commit()

    return jsonify(new_board.to_dict())


with app.app_context():
    db.create_all()
