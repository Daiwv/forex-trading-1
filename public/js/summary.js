$(document).ready(function() {

//position container holding all positions
var positions = $(".userPositions")

$(document).on("click", "button.sell", sellPositions);


// This function grabs the position from the database and updates the position container
function getPosition(author) {
    authorId = author || "";
    if (authorId) {
      authorId = "/?author_id=" + authorId;
    }
    $.get("/api/posts" + authorId, function(data) {
      console.log("Posts", data);
      posts = data;
      if (!posts || !posts.length) {
        displayEmpty(author);
      }
      else {
        initializeRows();
      }
    });
    
  }
































}
