import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import 'react-bootstrap-typeahead/css/Typeahead.bs5.css';
import './App.css';

import DRUGS from './drugs.json';
import NAME2ID from './name2id.json';

import { useState } from 'react';
import { Typeahead } from 'react-bootstrap-typeahead';
import { Button, ButtonGroup, Container, Row, Col, Form, FormGroup, Input, InputGroup, InputGroupText } from 'reactstrap';

var NAMES = [];
for (const key of Object.keys(NAME2ID)) {
  NAMES.push(key);
}

function collect(drugs) {
  // drug_id -> amount
  let drug2amount = {};
  for (const drug of drugs) {
    const drug_id = NAME2ID[drug.name];
    if (!drug_id) continue;
    if (drug2amount[drug_id] === undefined) {
      drug2amount[drug_id] = 0;
    }
    drug2amount[drug_id] += drug.amount;
  }
  return drug2amount;
}

function calc_equiv(d2amt) {
  let res = {'cp_fga': 0, 'cp_sga': 0, 'bpd': 0, 'imp': 0, 'dzp': 0};
  for (const [drug_id, amount] of Object.entries(d2amt)) {
    const equiv = DRUGS[drug_id].equiv_potency;
    for (const [equiv_key, equiv_potency] of Object.entries(equiv)) {
      if (!isNaN(equiv_potency)) {
        res[equiv_key] += amount * equiv_potency;
      }
    }
  }
  return res;
}


function drugname2unit(drug_name) {
  if (drug_name in NAME2ID) {
    return DRUGS[NAME2ID[drug_name]].unit;
  } else {
    return '???';
  }
}

function DrugEditor() {
  const [drugs, setDrugs] = useState([{ name: '', amount: 0 }]);

  const addDrug = (idx) => {
    const new_drugs = [...drugs];
    new_drugs.splice(idx + 1, 0, { name: '', amount: 0 });
    setDrugs(new_drugs);
  }

  const removeDrug = (idx) => {
    if (drugs.length > 1) {
      setDrugs(drugs.filter((s, sidx) => idx !== sidx));
    } else {
      setDrugs([{ name: '', amount: 0 }]);
    }
  }

  const onFormChange = (idx, drug) => {
    const newDrugs = drugs.map((s, sidx) => {
      if (idx !== sidx) return s;
      return Object.assign({}, s, drug);
    });
    setDrugs(newDrugs);
  }

  return (
    <>
      <Form>
        {drugs.map((drug, idx) => (
          <DrugForm key={idx} onChange={(change) => onFormChange(idx, change)} addDrug={() => addDrug(idx)} removeDrug={() => removeDrug(idx)} selected={drug.name} />
        ))}
      </Form >
      <DrugSummary drugs={drugs} />
    </>
  );
}

function DrugForm(props) {
  const onDrugChange = (selected) => {
    if (selected.length === 0) {
      props.onChange({ name: '' });
    } else {
      const drug = selected[0];
      if (drug !== props.selected) {
        props.onChange({ name: drug });
      }
    }
  }

  const onAmountChange = (e) => {
    props.onChange({amount: Number(e.target.value)});
  }

  return (
    <FormGroup row>
      <Col sm={6}>
        <Typeahead
          id={'typeahead' + props.idx}
          options={NAMES}
          placeholder="Choose a drug..."
          onChange={onDrugChange}
          clearButton={true}
          selected={props.selected === '' ? [] : [props.selected]}
          isValid={props.selected !== '' && (props.selected in NAME2ID)}
        />
      </Col>
      <Col sm={4}>
        <InputGroup>
          <Input placeholder="Amount" type="number" onChange={onAmountChange} />
          <InputGroupText>{drugname2unit(props.selected)}</InputGroupText>
        </InputGroup>
      </Col>
      <Col sm={2}>
        <ButtonGroup>
          <Button color="success" onClick={props.addDrug}>+</Button>
          <Button color="danger" onClick={props.removeDrug}>-</Button>
        </ButtonGroup>
      </Col>
    </FormGroup>
  )
}

function DrugSummary(props) {
  const id2amt = collect(props.drugs);
  const equiv = calc_equiv(id2amt);
  return (
    <>
      <ul>
        <li>CP換算: { (equiv['cp_fga'] + equiv['cp_sga']).toFixed(2) }mg (FGA: { equiv['cp_fga'].toFixed(2) }mg, SGA: { equiv['cp_sga'].toFixed(2) }mg)</li>
        <li>BPD換算: { equiv['bpd'].toFixed(2) }mg</li>
        <li>IMP換算: { equiv['imp'].toFixed(2) }mg</li>
        <li>DZP換算: { equiv['dzp'].toFixed(2) }mg</li>
      </ul>
    </>
  )
}



function App() {
  return (
    <Container>
      <Row>
        <Col>
          <p>This is a test!</p>
          <DrugEditor />
        </Col>
      </Row>
    </Container>
  );
}

export default App;
