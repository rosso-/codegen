const esprima = require('esprima');
const estraverse = require('estraverse');
const escodegen = require('escodegen');

let tree = esprima.parseScript('function sum() { return a }');
console.log(JSON.stringify(tree, 0, 4));

// estraverse.traverse(tree, {
//     enter: function (node, parent) {
//         console.log('enter node ', node.type, Object.keys(node));
//         if (parent)
//             console.log('enter parent ', parent.type, Object.keys(parent));
//     },
//     leave: function (node, parent) {
//         console.log('leave node', node.type, Object.keys(node));
//         if (parent)
//             console.log('leave parent ', parent.type, Object.keys(parent));
//     }
// })

const identifierDictionary = 'abcdefghijklmopqrstuvwxyz';
function randomIdentifier() {
  return identifierDictionary[Math.floor(Math.random() * identifierDictionary.length)];
}

const operatorDictionary = '+-*/';
function randomBinaryOperator() {
  return operatorDictionary[Math.floor(Math.random() * operatorDictionary.length)];
}

function mutationAddParameter(node) {
  node.params.push({
    type: 'Identifier',
    name: randomIdentifier()
  })
  return node;
}

function mutationAddReturnStatement(node) {
  node.body.push({
    type: 'ReturnStatement',
    argument: {
      type: 'Identifier',
      name: randomIdentifier()
    }
  })
  return node;
}

function mutationAddBinaryExpression(node) {
  node.argument = {
    type: 'BinaryExpression',
    operator: randomBinaryOperator(),
    left: {
      type: 'Identifier',
      name: node.argument.name
    },
    right: {
      type: 'Identifier',
      name: randomIdentifier()
    }
  }
  return node;
}

let replaced = estraverse.replace(tree, {
    enter: function (node, parent) {
        if (node.type === 'FunctionDeclaration') {
          if (Math.random() <= 0.1)
            return mutationAddParameter(node);
        }
        if (node.type === 'BlockStatement') {
          if (Math.random() <= 0.1)
            return mutationAddReturnStatement(node);
        }
        if (node.type === 'ReturnStatement') {
          return mutationAddBinaryExpression(node);
        }
        // if (node.type === 'Literal') {
        //     let { type, value, raw } = node;
        //     return { type, value: 2, raw };
        // }
    }
})

console.log(JSON.stringify(replaced, 0, 4));

let output = escodegen.generate(replaced);
console.log(output);

function generatePythonCode(node) {
  if (node.type === 'Program') {
    return node.body.map(generatePythonCode).join('\n');
  } else if (node.type === 'FunctionDeclaration') {
    const functionName = node.id.name;
    const args = node.params.map((param) => param.name).join(', ');
    const body = generatePythonCode(node.body);
    return `def ${functionName}(${args}):\n${body}`;
  } else if (node.type === 'ReturnStatement') {
    const value = generatePythonCode(node.argument);
    return `return ${value}`;
  } else if (node.type === 'BinaryExpression') {
    const left = generatePythonCode(node.left);
    const right = generatePythonCode(node.right);
    return `(${left} ${node.operator} ${right})`;
  } else if (node.type === 'CallExpression') {
    const callee = generatePythonCode(node.callee);
    const args = node.arguments.map(generatePythonCode).join(', ');
    return `${callee}(${args})`;
  } else if (node.type === 'Literal') {
    return node.raw;
  } else if (node.type === 'Identifier') {
    return node.name;
  } else if (node.type === 'VariableDeclaration') {
    return generatePythonCode(node.declarations[0]);
  } else if (node.type === 'VariableDeclarator') {
    return `${node.id.name} = ${node.init.value} `;
  } else if (node.type === 'BlockStatement') {
    return `    ${generatePythonCode(node.body[0])}`;
  } else {
    throw new Error(`Unsupported node type: ${node.type}`);
  }
}

let pythonCode = generatePythonCode(tree);
console.log(pythonCode);
