import $ from 'jquery';

import MapFileReader from './util/mapfilereader';
import MapRenderer from './editor/maprenderer';

// Info below mainly from the following sources:
// - http://www.shikadi.net/moddingwiki/MAP_Format_(Build)
// - https://github.com/jonof/jfbuild/blob/master/doc/buildinf.txt

$(() => {
  const renderer = new MapRenderer($("#mapcanvas")[0]);

  $("canvas").hide();

  $("#mapfile").on("change", e => {
    const files = e.target.files;
    if (!files.length) {
      return false;
    }
    $("canvas").show();
    $(".custom-file-label").html("<em>Loading...</em>");
    const name = files[0].name;
    const reader = new MapFileReader(files[0], map => {
      renderer.setMap(map);
      renderer.render();
      $(".custom-file-label").text(name);
    });
    $("#mapfile").val(null);
  });
});
