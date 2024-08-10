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


class Comment(db.Model):
    __tablename__ = "comment"
    id: Mapped[int] = mapped_column(primary_key=True)
    writer: Mapped[str] = mapped_column(nullable=False)
    date: Mapped[datetime] = mapped_column(nullable=False)
    content: Mapped[str] = mapped_column(nullable=False)
    title: Mapped[str] = mapped_column(nullable=True)

    parent_id: Mapped[int] = mapped_column(db.ForeignKey("comment.id"), nullable=True)
    parent: Mapped[Optional["Comment"]] = relationship("Comment", remote_side=[id])

    children: Mapped[List["Comment"]] = relationship("Comment", back_populates="parent")

    def to_dict(self):
        data = dict()
        data["id"] = self.id
        data["writer"] = self.writer
        data["date"] = self.date
        data["content"] = self.content
        data["parent_id"] = self.parent_id
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


@app.route("/forum/get_data", methods=["POST", "GET"])
def get_forum_data():
    first_root: Comment = db.session.execute(
        db.select(Comment).filter_by(parent=None)
    ).first()
    return jsonify(first_root.to_dict())


@app.route("/forum/append_comment", methods=["POST"])
def append_comment():
    new_comment = request.get_json()
    parent: Optional[Comment]
    if "parent_id" not in new_comment:
        parent = None
    else:
        parent = db.session.get(Comment, int(new_comment["parent_id"]))

    title = None
    if "title" in new_comment:
        title = new_comment["title"]
 
    new_comment = Comment(
        writer=new_comment["writer"],
        date=datetime.now(),
        content=new_comment["content"],
        parent=parent,
        title=title,
    )
    db.session.add(new_comment)

    if parent:
        parent.children.append(new_comment)
    db.session.commit()

    if parent:
        # Return Parent Tree
        return jsonify(parent.to_dict())
    else:
        # Return generated new root
        return jsonify(new_comment.to_dict())


with app.app_context():
    db.create_all()
