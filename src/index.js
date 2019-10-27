import $ from "jquery";

import MapFileReader from "./util/mapfilereader";
import Editor from "./editor/editor";
import MapRenderer from "./editor/maprenderer";

// Info mainly from the following sources:
// - http://www.shikadi.net/moddingwiki/MAP_Format_(Build)
// - https://github.com/jonof/jfbuild/blob/master/doc/buildinf.txt

$(() => {
  const renderer = new MapRenderer($("#mapcanvas")[0]);
  const editor = new Editor(renderer);

  $("canvas").hide();

  $("#mapfile").on("change", e => {
    const files = e.target.files;
    if (!files.length) {
      return false;
    }
    $("canvas").show();
    const name = files[0].name;
    const reader = new MapFileReader(files[0], map => {
      editor.setMap(map);
      $(".custom-file-label").text(name);
    });
    $("#mapfile").val(null);
  });
});
