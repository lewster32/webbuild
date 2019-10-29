import React from "react";
import { makeStyles } from "@material-ui/core/styles";

import Card from "@material-ui/core/Card";

import Grid from "@material-ui/core/Grid";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Collapse from "@material-ui/core/Collapse";
import Typography from "@material-ui/core/Typography";

import Input from "@material-ui/core/Input";
import InputAdornment from "@material-ui/core/InputAdornment";
import Checkbox from "@material-ui/core/Checkbox";

import InfoIcon from "@material-ui/icons/Info";

import Position from "../../../geom/position";

const useStyles = makeStyles(theme => ({
  nested: {
    padding: theme.spacing(2),
    margin: theme.spacing(2)
  },
  half: {
    width: "50%",
    marginRight: theme.spacing(1)
  },
  headingCell: {
    paddingRight: theme.spacing(2)
  },
  editorInput: {
    "& *": {
      display: "flex !important"
    }
  }
}));

export default class InfoPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: true,
      selected: null
    };
  }

  componentDidMount() {
    this.props.editor.onUpdate(editor => {
      if (editor.selected && editor.selected.size) {
        const currentSelection = [...editor.selected][0];
        this.setState({
          selected: {
            index: currentSelection.editorMeta.index,
            name: `${
              currentSelection.editorMeta.type
            } ${currentSelection.editorMeta.index.toString().padStart(6, "0")}`,
            props: currentSelection.getProps(),
            original: currentSelection
          }
        });
      } else {
        this.setState({
          selected: null
        });
      }
    });
  }

  componentWillUnmount() {}

  toggleOpen() {
    if (this.props.drawerOpen) {
      return;
    }
    this.setState({
      open: !this.state.open
    });
  }

  render() {
    return (
      <List>
        <ListItem
          button={this.props.drawerOpen}
          onClick={this.toggleOpen()}
          key="Info"
        >
          <ListItemIcon>
            <InfoIcon />
          </ListItemIcon>
          <ListItemText primary="Info" />
        </ListItem>
        <Collapse
          in={this.state.open && this.props.drawerOpen}
          timeout="auto"
          unmountOnExit
        >
          <InfoCard selected={this.state.selected} />
        </Collapse>
      </List>
    );
  }
}

function InfoCard(props) {
  const classes = useStyles();

  const updateValue = (object, key) => {
    return (val, subKey) => {
      if (subKey) {
        if (key === "position") {
          object[subKey] = val;
        } else {
          object[key][subKey] = val;
        }
      } else {
        object[key] = val;
      }
    };
  };

  return props.selected ? (
    <Card className={classes.nested} key={props.selected.name}>
      <Typography noWrap variant="h6" component="h2" gutterBottom>
        {props.selected.name}
      </Typography>

      {props.selected.props.map(row => (
        <Grid container spacing={2} aria-label="info table" key={row.key}>
          <Grid item xs={5}>
            <Typography noWrap color="textSecondary">
              {row.name}
            </Typography>
          </Grid>
          <Grid item xs={7}>
            <EditorValue
              className={classes.editorInput}
              type={row.type}
              subType={row.subType}
              value={row.value}
              updateValue={updateValue(props.selected.original, row.key)}
            />
          </Grid>
        </Grid>
      ))}
    </Card>
  ) : null;
}

function EditorValue(props) {
  const [value, setValue] = React.useState(props.value);

  const classes = useStyles();

  let InputTag;
  switch (props.type) {
    case "Point3":
      InputTag = getInputComponentTag(props.subType);
      return (
        <div className={classes.editorInput}>
          <InputTag
            startAdornment={<InputAdornment position="start">x</InputAdornment>}
            placeholder="x"
            value={value.x}
            updateValue={props.updateValue}
            updateValueSubKey="x"
          />
          <InputTag
            startAdornment={<InputAdornment position="start">y</InputAdornment>}
            placeholder="y"
            value={value.y}
            updateValue={props.updateValue}
            updateValueSubKey="y"
          />
          <InputTag
            startAdornment={<InputAdornment position="start">z</InputAdornment>}
            placeholder="z"
            value={value.z}
            updateValue={props.updateValue}
            updateValueSubKey="z"
          />
        </div>
      );
    case "Point2":
      InputTag = getInputComponentTag(props.subType);
      return (
        <div className={classes.editorInput}>
          <InputTag
            startAdornment={<InputAdornment position="start">x</InputAdornment>}
            placeholder="x"
            value={value.x}
            updateValue={props.updateValue}
            updateValueSubKey="x"
          />
          <InputTag
            startAdornment={<InputAdornment position="start">y</InputAdornment>}
            placeholder="y"
            value={value.y}
            updateValue={props.updateValue}
            updateValueSubKey="y"
          />
        </div>
      );
    case "Boolean":
      return <Checkbox color="default" value={value} />;
    default:
      InputTag = getInputComponentTag(props.type);
      return (
        <InputTag
          updateValue={props.updateValue}
          className={classes.editorInput}
          value={value}
        />
      );
  }
}

function getInputComponentTag(name) {
  const inputComponents = {
    Uint8Input,
    Int8Input,
    Uint16Input,
    Int16Input,
    Uint32Input,
    Int32Input,
    AngleInput
  };

  let tag = inputComponents[`${name}Input`];

  if (!tag) {
    tag = Input;
  }

  return tag;
}

class EditorInput extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value: props.value,
      valid: true
    };

    this.handleChange = this.handleChange.bind(this);
  }

  validate(value, callback) {
    if (value) {
      this.setState({ valid: true }, callback);
    } else {
      this.setState({ valid: false }, callback);
    }
  }

  handleChange(event) {
    const value = event.target.value;
    this.validate(value, () => {
      this.setState({ value: value }, () => {
        if (this.state.valid) {
          this.props.updateValue(value, this.props.updateValueSubKey || null);
        }
      });
    });
  }

  render() {
    return (
      <Input
        startAdornment={this.props.startAdornment}
        error={!this.state.valid}
        value={this.state.value}
        onChange={this.handleChange}
      />
    );
  }
}

class Uint8Input extends EditorInput {
  constructor(props) {
    super(props);
    this.range = { min: 0, max: 255 };
  }

  validate(value, callback) {
    if (value && value >= this.range.min && value <= this.range.max) {
      this.setState({ valid: true }, callback);
    } else {
      this.setState({ valid: false }, callback);
    }
  }

  render() {
    return (
      <Input
        startAdornment={this.props.startAdornment}
        error={!this.state.valid}
        type="number"
        inputProps={this.range}
        value={this.state.value}
        onChange={this.handleChange}
      />
    );
  }
}

class Int8Input extends Uint8Input {
  constructor(props) {
    super(props);
    this.range = { min: -127, max: 127 };
  }
}

class Uint16Input extends Uint8Input {
  constructor(props) {
    super(props);
    this.range = { min: 0, max: 65535 };
  }
}

class Int16Input extends Uint8Input {
  constructor(props) {
    super(props);
    this.range = { min: -32767, max: 32767 };
  }
}

class Uint32Input extends Uint8Input {
  constructor(props) {
    super(props);
    this.range = { min: 0, max: 4294967295 };
  }
}

class Int32Input extends Uint8Input {
  constructor(props) {
    super(props);
    this.range = { min: -2147483647, max: 2147483647 };
  }
}

class AngleInput extends Int16Input {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <Input
          error={!this.state.valid}
          type="number"
          inputProps={this.range}
          value={this.state.value}
          onChange={this.handleChange}
        />
        <Typography variant="body2">
          (~{Math.round(Position.toDegrees(this.state.value))}°)
        </Typography>
      </div>
    );
  }
}
