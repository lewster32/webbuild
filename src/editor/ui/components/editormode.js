import React from "react";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";

import PanIcon from "@material-ui/icons/OpenWith";
import SelectIcon from "@material-ui/icons/SelectAll";
import EditIcon from "@material-ui/icons/Edit";

import { MODE_PAN, MODE_SELECT, MODE_EDIT } from '../../../editor/editor'

export default function EditorMode(props) {
  const [state, setState] = React.useState({
    mode: MODE_PAN
  });

  const setMode = mode => {
    setState({
      mode: mode
    });
  };

  React.useEffect(() => {
    props.editor.setMode(state.mode);
  });

  return (
    <List>
      <ListItem
        button
        key="Pan Mode"
        selected={state.mode === MODE_PAN}
        onClick={event => setMode(MODE_PAN)}
      >
        <ListItemIcon>
          <PanIcon />
        </ListItemIcon>
        <ListItemText primary="Pan Mode" />
      </ListItem>
      <ListItem
        button
        key="Select Mode"
        selected={state.mode === MODE_SELECT}
        onClick={event => setMode(MODE_SELECT)}
      >
        <ListItemIcon>
          <SelectIcon />
        </ListItemIcon>
        <ListItemText primary="Select Mode" />
      </ListItem>
      <ListItem
        button
        key="Edit Mode"
        selected={state.mode === MODE_EDIT}
        onClick={event => setMode(MODE_EDIT)}
      >
        <ListItemIcon>
          <EditIcon />
        </ListItemIcon>
        <ListItemText primary="Edit Mode" />
      </ListItem>
    </List>
  );
}
