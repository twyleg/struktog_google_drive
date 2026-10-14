/*
 Copyright (C) 2019-2023 Thiemo Leonhardt, Klaus Ramm, Tom-Maurice Schreiber, Sören Schwab

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as
 published by the Free Software Foundation, either version 3 of the
 License, or (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { canCopyImage, copyImage } from "../helpers/imageClipboard";
import * as htmlToImage from "html-to-image";
import { config } from "../config";
import {
  getContentDefault,
  getNodeLabel,
  getUiLanguageSelectOptions,
  t,
} from "../i18n";
export class ImportExport {
  constructor(presenter, domRoot) {
    this.presenter = presenter;
    this.domRoot = domRoot;
    this.printHeight = 32;

    this.preRender();
  }

  render(model) {
    if (this.presenter.documents) this.presenter.documents.refresh();
  }

  preRender() {
    const optionsTarget =
      document.getElementById("optionButtonsGroup") ||
      document.getElementById("optionButtons");

    this.presenter.documents.mount(optionsTarget, {
      settings: () => this.openSettingsDialog(),
      export: () => this.openImageExportDialog(),
    });

    // ugly fix for HTMLToImage package
    // first creation of the image misses the lines in the image
    htmlToImage
      .toPng(document.getElementById("structogram"))
      .then(function (dataUrl) {});
  }

  /**
   * Render the current tree element on a canvas position and call to render childs
   *
   * @param    subTree        object of the current element / sub tree of the struktogramm
   * @param    ctx            instance of the canvas
   * @param    x              current x position on the canvas to start drawing
   * @param    xmax           absolute x position until then may be drawn
   * @param    y              current y position on the canvas to start drawing
   * @param    overhead       overhead of the current element, used to calculate the y position of the next element
   * @param    oneLineNodes   number of nodes that are drawn on one line, used to calculate the y position of the next element
   * @return   int            max y positon to which was drawn already, so the parent element knows where to draw the next element
   */
  renderTreeAsCanvas(subTree, ctx, x, xmax, y, givenStepSize = 1) {
    // uses a recursive structure, termination condition is no definied element to be drawn
    if (subTree === null) {
      return y;
    } else {
      const defaultMargin = 22;
      // use for every possible element type a different drawing strategie
      switch (subTree.type) {
        case "InsertNode":
          return this.renderTreeAsCanvas(
            subTree.followElement,
            ctx,
            x,
            xmax,
            y,
            givenStepSize
          );

        case "Placeholder": {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(xmax, y);
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + this.printHeight);
          ctx.moveTo(xmax, y);
          ctx.lineTo(xmax, y + this.printHeight);
          ctx.stroke();
          ctx.beginPath();
          const centerX = x + (xmax - x) / 2;
          const centerY = y + this.printHeight / 2;
          ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
          ctx.moveTo(centerX - 11, centerY + 11);
          ctx.lineTo(centerX + 11, centerY - 11);
          ctx.stroke();
          return y + this.printHeight;
        }

        case "InputNode": {
          const stepSize = this.printHeight * givenStepSize;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(xmax, y);
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + stepSize);
          ctx.moveTo(xmax, y);
          ctx.lineTo(xmax, y + stepSize);
          ctx.stroke();

          ctx.fillStyle = "#fcedce";
          ctx.rect(x, y, xmax, stepSize);
          ctx.fill();

          ctx.fillStyle = "black";
          ctx.beginPath();
          ctx.fillText(
            getContentDefault("inputPrefix") + ": " + subTree.text,
            x + 15,
            y + defaultMargin
          );
          ctx.stroke();
          return this.renderTreeAsCanvas(
            subTree.followElement,
            ctx,
            x,
            xmax,
            y + stepSize,
            givenStepSize
          );
        }

        case "OutputNode": {
          const stepSize = this.printHeight * givenStepSize;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(xmax, y);
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + stepSize);
          ctx.moveTo(xmax, y);
          ctx.lineTo(xmax, y + stepSize);
          ctx.stroke();

          ctx.fillStyle = "#fcedce";
          ctx.rect(x, y, xmax, stepSize);
          ctx.fill();

          ctx.fillStyle = "black";
          ctx.beginPath();
          ctx.fillText(
            getContentDefault("outputPrefix") + ": " + subTree.text,
            x + 15,
            y + defaultMargin
          );
          ctx.stroke();
          return this.renderTreeAsCanvas(
            subTree.followElement,
            ctx,
            x,
            xmax,
            y + stepSize,
            givenStepSize
          );
        }

        case "TaskNode": {
          const stepSize = this.printHeight * givenStepSize;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(xmax, y);
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + stepSize);
          ctx.moveTo(xmax, y);
          ctx.lineTo(xmax, y + stepSize);
          ctx.stroke();

          ctx.fillStyle = "#fcedce";
          ctx.rect(x, y, xmax - x, stepSize);
          ctx.fill();

          ctx.fillStyle = "black";
          ctx.beginPath();
          ctx.fillText(subTree.text, x + 15, y + defaultMargin);
          ctx.stroke();
          return this.renderTreeAsCanvas(
            subTree.followElement,
            ctx,
            x,
            xmax,
            y + stepSize,
            givenStepSize
          );
        }

        case "BlockCallNode": {
          const stepSize = this.printHeight * givenStepSize;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(xmax, y);
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + stepSize);
          ctx.moveTo(xmax, y);
          ctx.lineTo(xmax, y + stepSize);
          ctx.stroke();

          ctx.fillStyle = "#fcedce";
          ctx.rect(x, y, xmax - x, stepSize);
          ctx.fill();

          ctx.strokeStyle = "rgb(38, 64, 64)";
          ctx.beginPath();
          ctx.moveTo(x + 12, y);
          ctx.lineTo(x + 12, y + stepSize);
          ctx.moveTo(xmax - 12, y);
          ctx.lineTo(xmax - 12, y + stepSize);
          ctx.stroke();

          ctx.fillStyle = "black";
          ctx.beginPath();
          ctx.fillText(subTree.text, x + 15, y + defaultMargin);
          ctx.stroke();
          return this.renderTreeAsCanvas(
            subTree.followElement,
            ctx,
            x,
            xmax,
            y + stepSize,
            givenStepSize
          );
        }

        case "BranchNode": {
          ctx.fillStyle = "rgb(250, 218, 209)";
          ctx.beginPath(); // to end open paths
          ctx.rect(x, y, xmax - x, 2 * this.printHeight);
          ctx.fill();
          ctx.fillStyle = "black";
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (xmax - x) / 2, y + 2 * this.printHeight);
          ctx.moveTo(xmax, y);
          ctx.lineTo(x + (xmax - x) / 2, y + 2 * this.printHeight);
          ctx.stroke();
          // center the text
          const textWidth = ctx.measureText(subTree.text);
          ctx.beginPath();
          ctx.fillText(
            subTree.text,
            x + Math.abs(xmax - x - textWidth.width) / 2,
            y + defaultMargin
          );
          ctx.stroke();
          ctx.beginPath();
          const trueLabel = t("editor.trueLabel");
          const falseLabel = t("editor.falseLabel");
          ctx.fillText(trueLabel, x + 15, y + this.printHeight + defaultMargin);
          ctx.fillText(
            falseLabel,
            xmax - 15 - ctx.measureText(falseLabel).width,
            y + this.printHeight + defaultMargin
          );
          ctx.stroke();
          let trueChildY = 0;
          let falseChildY = 0;
          // render the child sub trees
          const trueDepth = this.preCountTreeDepth(subTree.trueChild);
          const falseDepth = this.preCountTreeDepth(subTree.falseChild);
          if (trueDepth > falseDepth) {
            trueChildY = this.renderTreeAsCanvas(
              subTree.trueChild,
              ctx,
              x,
              x + (xmax - x) / 2,
              y + 2 * this.printHeight,
              givenStepSize
            );
            falseChildY = this.renderTreeAsCanvas(
              subTree.falseChild,
              ctx,
              x + (xmax - x) / 2,
              xmax,
              y + 2 * this.printHeight,
              ((this.preCountTreeDepth(subTree.trueChild) -
                this.preCountNonOneLiners(subTree.falseChild)) /
                this.preCountOneLiners(subTree.falseChild)) *
                givenStepSize
            );
          } else {
            trueChildY = this.renderTreeAsCanvas(
              subTree.trueChild,
              ctx,
              x,
              x + (xmax - x) / 2,
              y + 2 * this.printHeight,
              ((this.preCountTreeDepth(subTree.falseChild) -
                this.preCountNonOneLiners(subTree.trueChild)) /
                this.preCountOneLiners(subTree.trueChild)) *
                givenStepSize
            );
            falseChildY = this.renderTreeAsCanvas(
              subTree.falseChild,
              ctx,
              x + (xmax - x) / 2,
              xmax,
              y + 2 * this.printHeight,
              givenStepSize
            );
          }

          // determine which child sub tree is deeper y wise
          let valueY, followY;
          if (trueChildY < falseChildY) {
            valueY = falseChildY;
            followY = trueChildY;
          } else {
            valueY = trueChildY;
            followY = falseChildY;
          }

          ctx.rect(x, y, xmax - x, valueY - y);
          ctx.stroke();

          return this.renderTreeAsCanvas(
            subTree.followElement,
            ctx,
            x,
            xmax,
            followY,
            givenStepSize
          );
        }

        case "CountLoopNode":
        case "HeadLoopNode": {
          const childY = this.renderTreeAsCanvas(
            subTree.child,
            ctx,
            x + (xmax - x) / 12,
            xmax,
            y + this.printHeight,
            givenStepSize
          );
          ctx.rect(x, y, xmax - x, childY - y);
          ctx.stroke();

          ctx.beginPath();
          ctx.fillStyle = "rgb(220, 239, 231)";
          ctx.rect(x, y, xmax, this.printHeight - 1);
          ctx.rect(x, y, (xmax - x) / 12 - 1, childY - y);
          ctx.fill();

          ctx.fillStyle = "black";
          ctx.beginPath();
          ctx.fillText(subTree.text, x + 15, y + defaultMargin);
          ctx.stroke();
          return this.renderTreeAsCanvas(
            subTree.followElement,
            ctx,
            x,
            xmax,
            childY,
            givenStepSize
          );
        }

        case "FootLoopNode": {
          const childY = this.renderTreeAsCanvas(
            subTree.child,
            ctx,
            x + (xmax - x) / 12,
            xmax,
            y,
            givenStepSize
          );
          ctx.rect(x, y, xmax - x, childY - y + this.printHeight);
          ctx.stroke();
          ctx.beginPath();
          ctx.fillStyle = "rgb(220, 239, 231)";
          ctx.rect(x, y, (xmax - x) / 12, childY - y + this.printHeight);
          ctx.rect(x, childY, xmax, this.printHeight);
          ctx.fill();

          ctx.fillStyle = "black";
          ctx.beginPath();
          ctx.fillText(subTree.text, x + 15, childY + defaultMargin);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + (xmax - x) / 12, childY);
          ctx.lineTo(xmax, childY);
          ctx.stroke();
          return this.renderTreeAsCanvas(
            subTree.followElement,
            ctx,
            x,
            xmax,
            childY + this.printHeight,
            givenStepSize
          );
        }

        case "CaseNode": {
          ctx.fillStyle = "rgb(250, 218, 209)";
          ctx.beginPath();
          ctx.rect(x, y, xmax - x, 2 * this.printHeight);
          ctx.fill();
          ctx.fillStyle = "black";
          let caseCount = subTree.cases.length;
          if (subTree.defaultOn) {
            caseCount = caseCount + 1;
          }
          // calculate the x and y distance between each case
          // yStep ist used for the positioning of the vertical lines on the diagonal line
          const xStep = (xmax - x) / caseCount;
          const yStep = this.printHeight / subTree.cases.length;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, y);
          if (subTree.defaultOn) {
            ctx.lineTo(xmax - xStep, y + this.printHeight);
            ctx.lineTo(xmax, y);
            ctx.moveTo(xmax - xStep, y + this.printHeight);
            ctx.lineTo(xmax - xStep, y + 2 * this.printHeight);
            ctx.stroke();
            const textWidth = ctx.measureText(subTree.text);
            ctx.beginPath();
            ctx.fillText(
              subTree.text,
              xmax - xStep - (textWidth.width * 1.3) / 2,
              y + defaultMargin * 0.7
            );
            ctx.stroke();
          } else {
            ctx.lineTo(xmax, y + this.printHeight);
            ctx.stroke();
            const textWidth = ctx.measureText(subTree.text);
            ctx.beginPath();
            ctx.fillText(
              subTree.text,
              xmax - textWidth.width,
              y + defaultMargin * 0.7
            );
            ctx.stroke();
          }

          let xPos = x;
          // determine the deepest tree by the y coordinate
          const maxDepth = this.preCountTreeDepth(subTree) - 2;
          const maxCase = this.getDeepestCase(subTree);
          let yFinally = y + 3 * this.printHeight;
          for (const element of subTree.cases) {
            let childY;
            if (maxCase === element) {
              // is the deepest tree
              childY = this.renderTreeAsCanvas(
                element,
                ctx,
                xPos,
                xPos + xStep,
                y + this.printHeight,
                givenStepSize
              );
            } else {
              if (maxDepth === this.preCountTreeDepth(element)) {
                // is not the deepest tree but has the same depth as the deepest tree
                const newStepSize =
                  (this.preCountTreeDepth(element) * givenStepSize -
                    this.preCountNonOneLiners(element)) /
                  this.preCountOneLiners(element);
                childY = this.renderTreeAsCanvas(
                  element,
                  ctx,
                  xPos,
                  xPos + xStep,
                  y + this.printHeight,
                  newStepSize
                );
              } else {
                // is not the deepest tree
                const newStepSize =
                  ((maxDepth - this.preCountNonOneLiners(element)) /
                    this.preCountOneLiners(element)) *
                  givenStepSize;
                childY = this.renderTreeAsCanvas(
                  element,
                  ctx,
                  xPos,
                  xPos + xStep,
                  y + this.printHeight,
                  newStepSize
                );
              }
            }
            if (childY > yFinally) {
              yFinally = childY;
            }
            xPos = xPos + xStep;
          }
          if (subTree.defaultOn) {
            let childY;
            if (maxCase === subTree.defaultNode) {
              // is the deepest tree
              childY = this.renderTreeAsCanvas(
                subTree.defaultNode,
                ctx,
                xPos,
                xPos + xStep,
                y + this.printHeight,
                givenStepSize
              );
            } else {
              if (maxDepth === this.preCountTreeDepth(subTree.defaultNode)) {
                // is not the deepest tree but has the same depth as the deepest tree
                const newStepSize =
                  (this.preCountTreeDepth(subTree.defaultNode) * givenStepSize -
                    this.preCountNonOneLiners(subTree.defaultNode)) /
                  this.preCountOneLiners(subTree.defaultNode);
                childY = this.renderTreeAsCanvas(
                  subTree.defaultNode,
                  ctx,
                  xPos,
                  xPos + xStep,
                  y + this.printHeight,
                  newStepSize
                );
              } else {
                // is not the deepest tree
                const newStepSize =
                  ((maxDepth - this.preCountNonOneLiners(subTree.defaultNode)) /
                    this.preCountOneLiners(subTree.defaultNode)) *
                  givenStepSize;
                childY = this.renderTreeAsCanvas(
                  subTree.defaultNode,
                  ctx,
                  xPos,
                  xPos + xStep,
                  y + this.printHeight,
                  newStepSize
                );
              }
            }
            if (childY > yFinally) {
              yFinally = childY;
            }
          }
          // draw the vertical lines
          for (let i = 1; i <= subTree.cases.length; i++) {
            ctx.beginPath();
            ctx.moveTo(x + i * xStep, y + i * yStep);
            ctx.lineTo(x + i * xStep, yFinally);
            ctx.stroke();
          }
          return this.renderTreeAsCanvas(
            subTree.followElement,
            ctx,
            x,
            xmax,
            yFinally,
            givenStepSize
          );
        }

        case "InsertCase": {
          const textWidth = ctx.measureText(subTree.text);
          ctx.beginPath();
          ctx.fillText(
            subTree.text,
            x + Math.abs(xmax - x - textWidth.width) / 2,
            y + defaultMargin
          );
          ctx.stroke();
          return this.renderTreeAsCanvas(
            subTree.followElement,
            ctx,
            x,
            xmax,
            y + this.printHeight,
            givenStepSize
          );
        }

        case "FunctionNode": {
          const childY = this.renderTreeAsCanvas(
            subTree.child,
            ctx,
            x + (xmax - x) / 12,
            xmax,
            y + this.printHeight
          );
          ctx.rect(x, y, xmax - x, childY - y);
          ctx.stroke();

          ctx.beginPath();
          ctx.fillStyle = "white";
          ctx.rect(x, y, xmax, this.printHeight - 1);
          ctx.rect(x, y, (xmax - x) / 12 - 1, childY - y + this.printHeight);
          ctx.rect(x, childY, xmax, this.printHeight - 2);
          ctx.fill();

          ctx.fillStyle = "black";
          ctx.beginPath();
          let paramsText = "";
          for (let index = 0; index < subTree.parameters.length; index++) {
            if (
              subTree.parameters.length === 0 ||
              index === subTree.parameters.length - 1
            ) {
              paramsText += subTree.parameters[index].parName;
            } else {
              paramsText += subTree.parameters[index].parName + ", ";
            }
          }
          const returnType = (subTree.returnType || "").trim();
          const returnTypeText = returnType === "" ? "" : " -> " + returnType;
          ctx.fillText(
            getContentDefault("functionKeyword") +
              " " +
              subTree.text +
              "(" +
              paramsText +
              ")" +
              returnTypeText +
              " {",
            x + 15,
            y + defaultMargin
          );
          ctx.fillText("}", x + 15, childY + defaultMargin);
          ctx.stroke();
          return this.renderTreeAsCanvas(
            subTree.followElement,
            ctx,
            x,
            xmax,
            childY + this.printHeight
          );
        }

        case "TryCatchNode": {
          const trychildY = this.renderTreeAsCanvas(
            subTree.tryChild,
            ctx,
            x + (xmax - x) / 12,
            xmax,
            y + this.printHeight,
            givenStepSize
          );
          const catchchildY = this.renderTreeAsCanvas(
            subTree.catchChild,
            ctx,
            x + (xmax - x) / 12,
            xmax,
            trychildY + this.printHeight,
            givenStepSize
          );
          ctx.rect(x, y, xmax - x, catchchildY - y);
          ctx.stroke();

          ctx.beginPath();
          ctx.fillStyle = "rgb(250, 218, 209)";
          ctx.rect(x, y, xmax, this.printHeight - 1);
          ctx.rect(x, trychildY, xmax, this.printHeight - 1);
          ctx.rect(x, y, (xmax - x) / 12 - 1, catchchildY - y);
          ctx.fill();

          ctx.fillStyle = "black";
          ctx.beginPath();
          ctx.fillText(
            getContentDefault("tryLabel"),
            x + 15,
            y + defaultMargin
          );
          ctx.fillText(
            getContentDefault("catchLabel"),
            x + 15,
            trychildY + defaultMargin
          );
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + (xmax - x) / 12, trychildY);
          ctx.lineTo(xmax, trychildY);
          ctx.stroke();

          return this.renderTreeAsCanvas(
            subTree.followElement,
            ctx,
            x,
            xmax,
            catchchildY,
            givenStepSize
          );
        }
      }
    }
  }

  /**
   * Count the depth of the current tree element
   *
   * @param    subTree   object of the current element / sub tree of the struktogramm
   * @return   int       depth of the current tree element
   */
  preCountTreeDepth(subTree) {
    if (subTree === null) {
      return 0;
    } else {
      switch (subTree.type) {
        case "FunctionNode":
        case "InsertNode":
        case "InsertCase":
          return this.preCountTreeDepth(subTree.followElement);

        case "Placeholder": {
          return 1;
        }

        case "InputNode":
        case "OutputNode":
        case "BlockCallNode":
        case "TaskNode": {
          return 1 + this.preCountTreeDepth(subTree.followElement);
        }

        case "BranchNode": {
          const trueChild = this.preCountTreeDepth(subTree.trueChild);
          const falseChild = this.preCountTreeDepth(subTree.falseChild);
          if (trueChild < falseChild) {
            return 2 + falseChild;
          } else {
            return 2 + trueChild;
          }
        }

        case "CountLoopNode":
        case "HeadLoopNode":
        case "FootLoopNode": {
          return (
            1 +
            this.preCountTreeDepth(subTree.child) +
            this.preCountTreeDepth(subTree.followElement)
          );
        }

        case "TryCatchNode": {
          return (
            2 +
            this.preCountTreeDepth(subTree.tryChild) +
            this.preCountTreeDepth(subTree.catchChild) +
            this.preCountTreeDepth(subTree.followElement)
          );
        }

        case "CaseNode": {
          const maxList = [];
          for (const element of subTree.cases) {
            maxList.push(this.preCountTreeDepth(element));
          }
          if (subTree.defaultOn) {
            maxList.push(this.preCountTreeDepth(subTree.defaultNode));
          }
          return 2 + Math.max(...maxList);
        }
      }
    }
  }

  /**
   * Return the case with the deepest depth
   *
   * @param {*} subTree
   * @returns
   */
  getDeepestCase(subTree) {
    const maxList = [];
    const normalNodes = [];
    for (const element of subTree.cases) {
      maxList.push(this.preCountTreeDepth(element));
      normalNodes.push(this.preCountOneLiners(element));
    }
    if (subTree.defaultOn) {
      maxList.push(this.preCountTreeDepth(subTree.defaultNode));
      normalNodes.push(this.preCountOneLiners(subTree.defaultNode));
    }
    const maxDeph = Math.max(...maxList);
    for (let index = 0; index < maxList.length; index++) {
      if (maxList[index] === maxDeph) {
        maxList[index] += normalNodes[index];
      }
    }
    const index = maxList.indexOf(Math.max(...maxList));
    if (index === maxList.length - 1) {
      return subTree.defaultNode;
    } else {
      return subTree.cases[index];
    }
  }

  /**
   * Count the depth of the current tree element
   *
   * @param    subTree   object of the current element / sub tree of the struktogramm
   * @return   int       depth of the current tree element
   */
  preCountNonOneLiners(subTree) {
    if (subTree === null) {
      return 0;
    } else {
      switch (subTree.type) {
        case "FunctionNode":
        case "InsertNode":
        case "InsertCase":
          return this.preCountNonOneLiners(subTree.followElement);

        case "Placeholder": {
          return 0;
        }

        case "InputNode":
        case "OutputNode":
        case "BlockCallNode":
        case "TaskNode": {
          return this.preCountNonOneLiners(subTree.followElement);
        }

        case "BranchNode": {
          const trueChild = this.preCountNonOneLiners(subTree.trueChild);
          const falseChild = this.preCountNonOneLiners(subTree.falseChild);
          if (trueChild < falseChild) {
            return 2 + falseChild;
          } else {
            return 2 + trueChild;
          }
        }

        case "CountLoopNode":
        case "HeadLoopNode":
        case "FootLoopNode": {
          return (
            1 +
            this.preCountNonOneLiners(subTree.child) +
            this.preCountNonOneLiners(subTree.followElement)
          );
        }

        case "TryCatchNode": {
          return (
            2 +
            this.preCountNonOneLiners(subTree.tryChild) +
            this.preCountNonOneLiners(subTree.catchChild) +
            this.preCountNonOneLiners(subTree.followElement)
          );
        }

        case "CaseNode": {
          const maxList = [];
          for (const element of subTree.cases) {
            maxList.push(this.preCountNonOneLiners(element));
          }
          if (subTree.defaultOn) {
            maxList.push(this.preCountNonOneLiners(subTree.defaultNode));
          }
          return (
            2 +
            // Math.max(...maxList)
            this.preCountNonOneLiners(this.getDeepestCase(subTree))
          );
        }
      }
    }
  }

  /**
   * Count the depth of the current tree element
   *
   * @param    subTree   object of the current element / sub tree of the struktogramm
   * @return   int       depth of the current tree element
   */
  preCountOneLiners(subTree) {
    if (subTree === null) {
      return 0;
    } else {
      switch (subTree.type) {
        case "FunctionNode":
        case "InsertNode":
        case "InsertCase":
          return this.preCountOneLiners(subTree.followElement);

        case "Placeholder": {
          return 1;
        }

        case "InputNode":
        case "OutputNode":
        case "BlockCallNode":
        case "TaskNode": {
          return 1 + this.preCountOneLiners(subTree.followElement);
        }

        case "BranchNode": {
          const trueChild = this.preCountOneLiners(subTree.trueChild);
          const falseChild = this.preCountOneLiners(subTree.falseChild);
          if (trueChild < falseChild) {
            return falseChild;
          } else {
            return trueChild;
          }
        }

        case "CountLoopNode":
        case "HeadLoopNode":
        case "FootLoopNode": {
          return (
            this.preCountOneLiners(subTree.child) +
            this.preCountOneLiners(subTree.followElement)
          );
        }

        case "TryCatchNode": {
          return (
            this.preCountOneLiners(subTree.tryChild) +
            this.preCountOneLiners(subTree.catchChild) +
            this.preCountOneLiners(subTree.followElement)
          );
        }

        case "CaseNode": {
          const maxList = [];
          for (const element of subTree.cases) {
            maxList.push(this.preCountOneLiners(element));
          }
          if (subTree.defaultOn) {
            maxList.push(this.preCountOneLiners(subTree.defaultNode));
          }
          return Math.max(...maxList);
        }
      }
    }
  }

  /**
   * Create a PNG file of the current model and append a button for downloading
   */
  exportAsPng(model) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const width =
      document.getElementById("structogram").parentElement.parentElement
        .clientWidth;
    canvas.width = width;
    canvas.height = document.getElementById("structogram").clientHeight;

    ctx.font = "16px sans-serif";
    ctx.lineWidth = "1";
    // render the tree on the canvas
    const lastY = this.renderTreeAsCanvas(model, ctx, 0, width, 0);
    ctx.rect(0, 0, width, lastY + 1);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.stroke();

    // define filename
    const exportFileDefaultName =
      "struktog_" + new Date(Date.now()).toJSON().substring(0, 10) + ".png";

    // create button / anker element
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", canvas.toDataURL("image/png"));
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  }

  /**
   * Create a PNG file of the current model with htmtToImage and append a button for downloading
   */
  exportAsPngWithPackage() {
    htmlToImage
      .toPng(document.getElementById("structogram"))
      .then((dataUrl) => {
        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUrl);
        const exportFileDefaultName = this.buildImageExportFileName("png");
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();
      })
      .catch(function (error) {
        console.error("oops, something went wrong!", error);
      });
  }

  exportAsSvgWithPackage() {
    htmlToImage
      .toSvg(document.getElementById("structogram"))
      .then((dataUrl) => {
        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUrl);
        const exportFileDefaultName = this.buildImageExportFileName("svg");
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();
      })
      .catch(function (error) {
        console.error("oops, something went wrong!", error);
      });
  }

  buildImageExportFileName(extension) {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();

    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;

    const timeString = hours + "-" + minutes;
    const structoName = document.getElementById("structoName").innerHTML;
    return (
      structoName +
      "-" +
      new Date(Date.now()).toJSON().substring(0, 10) +
      "-" +
      timeString +
      "." +
      extension
    );
  }

  openImageExportDialog() {
    const { content, footer } = this.clearModal();
    footer.classList.add("settingsFooter", "imageExportFooter");

    const title = document.createElement("div");
    title.classList.add("settingsTitle");
    title.appendChild(
      document.createTextNode(t("importExport.imageExportFormatTitle"))
    );
    content.appendChild(title);

    const exportPngButton = document.createElement("div");
    exportPngButton.classList.add(
      "modal-buttons",
      "settingsActionButton",
      "hand"
    );
    exportPngButton.appendChild(
      document.createTextNode(t("importExport.exportPng"))
    );
    exportPngButton.addEventListener("click", () => {
      document.getElementById("IEModal").classList.remove("active");
      this.exportAsPngWithPackage();
    });
    footer.appendChild(exportPngButton);

    const exportSvgButton = document.createElement("div");
    exportSvgButton.classList.add(
      "modal-buttons",
      "settingsActionButton",
      "hand"
    );
    exportSvgButton.appendChild(
      document.createTextNode(t("importExport.exportSvg"))
    );
    exportSvgButton.addEventListener("click", () => {
      document.getElementById("IEModal").classList.remove("active");
      this.exportAsSvgWithPackage();
    });
    footer.appendChild(exportSvgButton);

    const copyStatus = document.createElement("p");
    copyStatus.setAttribute("role", "status");
    copyStatus.setAttribute("aria-live", "polite");
    content.appendChild(copyStatus);
    const copyButtons = [];
    for (const format of ["png", "svg"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.add("modal-buttons", "settingsActionButton", "hand");
      button.textContent = t(
        format === "png" ? "importExport.copyPng" : "importExport.copySvg"
      );
      button.disabled = !canCopyImage(format);
      button.addEventListener("click", async () => {
        copyButtons.forEach((item) => {
          item.disabled = true;
        });
        copyStatus.textContent = t("importExport.copyingImage");
        try {
          await copyImage(format, () => {
            const node = document.getElementById("structogram");
            return format === "png"
              ? htmlToImage.toPng(node)
              : htmlToImage.toSvg(node);
          });
          copyStatus.textContent = t("importExport.imageCopied");
        } catch (error) {
          copyStatus.textContent = t("importExport.imageCopyFailed");
        } finally {
          copyButtons.forEach((item, index) => {
            item.disabled = !canCopyImage(index === 0 ? "png" : "svg");
          });
        }
      });
      copyButtons.push(button);
      footer.appendChild(button);
    }
    if (!canCopyImage("png") || !canCopyImage("svg")) {
      const hint = document.createElement("p");
      hint.textContent = t(
        !canCopyImage("png")
          ? "importExport.clipboardUnavailable"
          : "importExport.svgClipboardUnavailable"
      );
      content.appendChild(hint);
    }

    const cancelButton = document.createElement("div");
    cancelButton.classList.add("modal-buttons", "settingsActionButton", "hand");
    cancelButton.appendChild(document.createTextNode(t("common.cancel")));
    cancelButton.addEventListener("click", () =>
      document.getElementById("IEModal").classList.remove("active")
    );
    footer.appendChild(cancelButton);

    document.getElementById("IEModal").classList.add("active");
  }

  clearModal() {
    const content = document.getElementById("modal-content");
    const footer = document.getElementById("modal-footer");
    footer.classList.remove("settingsFooter", "imageExportFooter");
    while (content.hasChildNodes()) {
      content.removeChild(content.lastChild);
    }
    while (footer.hasChildNodes()) {
      footer.removeChild(footer.lastChild);
    }
    return { content, footer };
  }

  getLanguageOptions() {
    const languageOptions = [];
    const languageSelect = document.getElementById("SourcecodeSelect");
    if (!languageSelect) {
      return languageOptions;
    }

    for (const option of languageSelect.options) {
      languageOptions.push({
        value: option.value,
        text: option.text,
      });
    }
    return languageOptions;
  }

  renderSettingsElements(domNode, elements) {
    while (domNode.hasChildNodes()) {
      domNode.removeChild(domNode.lastChild);
    }

    for (const element of elements) {
      const row = document.createElement("label");
      row.classList.add("settingsCheck");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = element.use;
      checkbox.dataset.nodeType = element.key;
      row.appendChild(checkbox);
      row.appendChild(document.createTextNode(element.text));
      domNode.appendChild(row);
    }
  }

  normalizeHexColor(colorValue) {
    if (typeof colorValue !== "string") {
      return "#ffffff";
    }

    const trimmedValue = colorValue.trim();
    const hexMatch = trimmedValue.match(/^#([\da-fA-F]{3}|[\da-fA-F]{6})$/);
    if (hexMatch) {
      if (trimmedValue.length === 4) {
        return (
          "#" +
          trimmedValue[1] +
          trimmedValue[1] +
          trimmedValue[2] +
          trimmedValue[2] +
          trimmedValue[3] +
          trimmedValue[3]
        ).toLowerCase();
      }
      return trimmedValue.toLowerCase();
    }

    const rgbMatch = trimmedValue.match(
      /^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
    );
    if (!rgbMatch) {
      return "#ffffff";
    }

    const channels = rgbMatch.slice(1).map((item) => Number(item));
    if (
      channels.some(
        (channel) => Number.isNaN(channel) || channel < 0 || channel > 255
      )
    ) {
      return "#ffffff";
    }

    const toHex = (channel) => channel.toString(16).padStart(2, "0");
    return "#" + channels.map((channel) => toHex(channel)).join("");
  }

  openSettingsDialog() {
    const { content, footer } = this.clearModal();
    footer.classList.add("settingsFooter");
    const settings = {
      profile: this.presenter.getActiveConfigProfile(),
      elements: this.presenter.getSettingsElements(),
      colors: this.presenter.getSettingsColors(),
      uiLanguage: this.presenter.getUiLanguage() || "auto",
      language: this.presenter.getCodeLanguage(),
      displaySourcecode: this.presenter.getSourcecodeDisplay(),
      shortcutsEnabled: this.presenter.getShortcutsEnabled(),
      restrictFunctionInsertToTop:
        this.presenter.getRestrictFunctionInsertToTop(),
    };

    const title = document.createElement("div");
    title.classList.add("settingsTitle");
    title.appendChild(document.createTextNode(t("importExport.settingsTitle")));
    content.appendChild(title);

    const tabList = document.createElement("div");
    tabList.classList.add("settingsTabs");

    const generalTabButton = document.createElement("button");
    generalTabButton.type = "button";
    generalTabButton.classList.add("settingsTabButton", "active");
    generalTabButton.appendChild(
      document.createTextNode(t("importExport.tabGeneral"))
    );

    const colorTabButton = document.createElement("button");
    colorTabButton.type = "button";
    colorTabButton.classList.add("settingsTabButton");
    colorTabButton.appendChild(
      document.createTextNode(t("importExport.tabColors"))
    );

    tabList.appendChild(generalTabButton);
    tabList.appendChild(colorTabButton);
    content.appendChild(tabList);

    const generalPanel = document.createElement("div");
    generalPanel.classList.add("settingsTabPanel", "active");
    const colorPanel = document.createElement("div");
    colorPanel.classList.add("settingsTabPanel");
    content.appendChild(generalPanel);
    content.appendChild(colorPanel);

    const setActiveTab = (tabId) => {
      const showGeneral = tabId === "general";
      generalTabButton.classList.toggle("active", showGeneral);
      colorTabButton.classList.toggle("active", !showGeneral);
      generalPanel.classList.toggle("active", showGeneral);
      colorPanel.classList.toggle("active", !showGeneral);
    };

    generalTabButton.addEventListener("click", () => setActiveTab("general"));
    colorTabButton.addEventListener("click", () => setActiveTab("colors"));

    const profileContainer = document.createElement("div");
    profileContainer.classList.add("settingsGroup");
    const profileLabel = document.createElement("label");
    profileLabel.appendChild(
      document.createTextNode(t("importExport.profile"))
    );
    profileContainer.appendChild(profileLabel);
    const profileSelect = document.createElement("select");
    profileSelect.classList.add("form-select", "settingsSelect");
    const profiles = Object.keys(config.alternatives)
      .filter((profile) => profile !== "standard")
      .sort((a, b) => a.localeCompare(b));
    profiles.unshift("standard");
    for (const profile of profiles) {
      const option = document.createElement("option");
      option.value = profile;
      option.appendChild(document.createTextNode(profile));
      if (profile === settings.profile) {
        option.selected = true;
      }
      profileSelect.appendChild(option);
    }
    profileContainer.appendChild(profileSelect);
    generalPanel.appendChild(profileContainer);

    const elementsContainer = document.createElement("div");
    elementsContainer.classList.add("settingsGroup");
    const elementsLabel = document.createElement("label");
    elementsLabel.appendChild(
      document.createTextNode(t("importExport.showElements"))
    );
    elementsContainer.appendChild(elementsLabel);
    const elementsGrid = document.createElement("div");
    elementsGrid.classList.add("settingsGrid");
    this.renderSettingsElements(elementsGrid, settings.elements);
    elementsContainer.appendChild(elementsGrid);
    generalPanel.appendChild(elementsContainer);

    const elementLabels = {};
    for (const element of settings.elements) {
      elementLabels[element.key] = element.text;
    }

    const colorGroups = [
      {
        title: t("importExport.colorGroupInputOutput"),
        keys: ["InputNode", "OutputNode", "TaskNode", "BlockCallNode"],
      },
      {
        title: t("importExport.colorGroupLoops"),
        keys: ["CountLoopNode", "HeadLoopNode", "FootLoopNode"],
      },
      {
        title: t("importExport.colorGroupBranching"),
        keys: ["BranchNode", "CaseNode", "TryCatchNode"],
      },
      {
        title: t("importExport.colorGroupFunctions"),
        keys: ["FunctionNode"],
      },
    ];

    const colorInputMap = {};
    const colorValueMap = {};
    const updateColorValueLabel = (key) => {
      if (!(key in colorInputMap) || !(key in colorValueMap)) {
        return;
      }
      colorValueMap[key].textContent = colorInputMap[key].value.toUpperCase();
    };

    const applyColorSettings = (colorSettings) => {
      for (const key of this.presenter.getSettingsElementKeys()) {
        if (!(key in colorInputMap)) {
          continue;
        }
        if (key in colorSettings) {
          colorInputMap[key].value = this.normalizeHexColor(colorSettings[key]);
          updateColorValueLabel(key);
        }
      }
    };

    const getProfileColors = () => {
      const profileConfig = config.alternatives[profileSelect.value];
      const profileColors = {};
      for (const key of this.presenter.getSettingsElementKeys()) {
        profileColors[key] = profileConfig[key].color;
      }
      return profileColors;
    };

    const getDefaultEditorColors = () => {
      const fallbackProfile =
        "standard" in config.alternatives
          ? config.alternatives.standard
          : config.alternatives[profileSelect.value];
      const defaultColors = {};
      for (const key of this.presenter.getSettingsElementKeys()) {
        defaultColors[key] = fallbackProfile[key].color;
      }
      return defaultColors;
    };

    const resetColorButton = document.createElement("button");
    resetColorButton.type = "button";
    resetColorButton.classList.add("settingsColorResetButton");
    resetColorButton.appendChild(
      document.createTextNode(t("importExport.resetColors"))
    );
    resetColorButton.addEventListener("click", () => {
      applyColorSettings(getDefaultEditorColors());
    });
    colorPanel.appendChild(resetColorButton);

    for (const group of colorGroups) {
      const colorGroup = document.createElement("div");
      colorGroup.classList.add("settingsColorGroup");

      const colorGroupHeader = document.createElement("div");
      colorGroupHeader.classList.add("settingsColorGroupHeader");
      const colorGroupTitle = document.createElement("strong");
      colorGroupTitle.appendChild(document.createTextNode(group.title));
      colorGroupHeader.appendChild(colorGroupTitle);

      if (group.keys.length > 1) {
        const syncGroupButton = document.createElement("button");
        syncGroupButton.type = "button";
        syncGroupButton.classList.add("settingsColorSyncButton");
        syncGroupButton.appendChild(
          document.createTextNode(t("importExport.applyGroupColor"))
        );
        syncGroupButton.addEventListener("click", () => {
          const leadKey = group.keys[0];
          if (!(leadKey in colorInputMap)) {
            return;
          }
          const leadColor = colorInputMap[leadKey].value;
          for (const key of group.keys) {
            if (key in colorInputMap) {
              colorInputMap[key].value = leadColor;
              updateColorValueLabel(key);
            }
          }
        });
        colorGroupHeader.appendChild(syncGroupButton);
      }

      colorGroup.appendChild(colorGroupHeader);

      for (const key of group.keys) {
        const row = document.createElement("label");
        row.classList.add("settingsColorRow");

        const rowLabel = document.createElement("span");
        rowLabel.appendChild(
          document.createTextNode(
            key in elementLabels ? elementLabels[key] : key
          )
        );
        row.appendChild(rowLabel);

        const colorPicker = document.createElement("input");
        colorPicker.type = "color";
        colorPicker.classList.add("settingsColorInput");
        colorPicker.dataset.nodeType = key;
        colorPicker.value = this.normalizeHexColor(settings.colors[key]);
        colorPicker.addEventListener("input", () => updateColorValueLabel(key));
        colorInputMap[key] = colorPicker;
        row.appendChild(colorPicker);

        const colorValue = document.createElement("span");
        colorValue.classList.add("settingsColorValue");
        colorValueMap[key] = colorValue;
        row.appendChild(colorValue);
        updateColorValueLabel(key);

        colorGroup.appendChild(row);
      }

      colorPanel.appendChild(colorGroup);
    }

    profileSelect.addEventListener("change", () => {
      const profileConfig = config.alternatives[profileSelect.value];
      const profileElements = this.presenter
        .getSettingsElementKeys()
        .map((key) => ({
          key,
          text: getNodeLabel(key),
          use: profileConfig[key].use,
        }));
      this.renderSettingsElements(elementsGrid, profileElements);
      applyColorSettings(getProfileColors());
    });

    const uiLanguageContainer = document.createElement("div");
    uiLanguageContainer.classList.add("settingsGroup");
    const uiLanguageLabel = document.createElement("label");
    uiLanguageLabel.appendChild(
      document.createTextNode(t("importExport.uiLanguage"))
    );
    uiLanguageContainer.appendChild(uiLanguageLabel);
    const uiLanguageSelect = document.createElement("select");
    uiLanguageSelect.classList.add("form-select", "settingsSelect");
    for (const optionItem of getUiLanguageSelectOptions()) {
      const option = document.createElement("option");
      option.value = optionItem.value;
      option.appendChild(document.createTextNode(optionItem.label));
      if (optionItem.value === settings.uiLanguage) {
        option.selected = true;
      }
      uiLanguageSelect.appendChild(option);
    }
    uiLanguageContainer.appendChild(uiLanguageSelect);
    generalPanel.appendChild(uiLanguageContainer);

    const languageContainer = document.createElement("div");
    languageContainer.classList.add("settingsGroup");
    const languageLabel = document.createElement("label");
    languageLabel.appendChild(
      document.createTextNode(t("importExport.language"))
    );
    languageContainer.appendChild(languageLabel);
    const languageSelect = document.createElement("select");
    languageSelect.classList.add("form-select", "settingsSelect");
    for (const item of this.getLanguageOptions()) {
      const option = document.createElement("option");
      option.value = item.value;
      option.appendChild(document.createTextNode(item.text));
      if (item.value === settings.language) {
        option.selected = true;
      }
      languageSelect.appendChild(option);
    }
    languageContainer.appendChild(languageSelect);
    generalPanel.appendChild(languageContainer);

    const sourcecodeToggle = document.createElement("label");
    sourcecodeToggle.classList.add("settingsCheck");
    const sourcecodeCheckbox = document.createElement("input");
    sourcecodeCheckbox.type = "checkbox";
    sourcecodeCheckbox.checked = settings.displaySourcecode;
    sourcecodeToggle.appendChild(sourcecodeCheckbox);
    sourcecodeToggle.appendChild(
      document.createTextNode(t("importExport.showSourcecode"))
    );
    generalPanel.appendChild(sourcecodeToggle);

    const shortcutToggle = document.createElement("label");
    shortcutToggle.classList.add("settingsCheck");
    const shortcutCheckbox = document.createElement("input");
    shortcutCheckbox.type = "checkbox";
    shortcutCheckbox.checked = settings.shortcutsEnabled;
    shortcutToggle.appendChild(shortcutCheckbox);
    shortcutToggle.appendChild(
      document.createTextNode(t("importExport.enableShortcuts"))
    );
    generalPanel.appendChild(shortcutToggle);

    const functionInsertToggle = document.createElement("label");
    functionInsertToggle.classList.add("settingsCheck");
    const functionInsertCheckbox = document.createElement("input");
    functionInsertCheckbox.type = "checkbox";
    functionInsertCheckbox.checked = settings.restrictFunctionInsertToTop;
    functionInsertToggle.appendChild(functionInsertCheckbox);
    functionInsertToggle.appendChild(
      document.createTextNode(t("importExport.restrictFunctionInsertToTop"))
    );
    generalPanel.appendChild(functionInsertToggle);

    const saveButton = document.createElement("div");
    saveButton.classList.add("modal-buttons", "settingsActionButton", "hand");
    saveButton.appendChild(document.createTextNode(t("common.ok")));
    saveButton.addEventListener("click", () => {
      const elementSettings = {};
      for (const checkbox of elementsGrid.getElementsByTagName("input")) {
        elementSettings[checkbox.dataset.nodeType] = checkbox.checked;
      }
      const colorSettings = {};
      for (const [key, colorInput] of Object.entries(colorInputMap)) {
        colorSettings[key] = colorInput.value;
      }
      const hasActiveElement = Object.values(elementSettings).some(
        (value) => value
      );
      if (!hasActiveElement) {
        window.alert(t("importExport.atLeastOneElement"));
        return;
      }

      const previousUiLanguage = this.presenter.getUiLanguage();

      this.presenter.applySettings({
        profile: profileSelect.value,
        elements: elementSettings,
        colors: colorSettings,
        uiLanguage: uiLanguageSelect.value,
        language: languageSelect.value,
        displaySourcecode: sourcecodeCheckbox.checked,
        shortcutsEnabled: shortcutCheckbox.checked,
        restrictFunctionInsertToTop: functionInsertCheckbox.checked,
      });
      document.getElementById("IEModal").classList.remove("active");
      if (uiLanguageSelect.value !== previousUiLanguage) {
        window.location.reload();
      }
    });

    footer.appendChild(saveButton);

    const cancelButton = document.createElement("div");
    cancelButton.classList.add("modal-buttons", "settingsActionButton", "hand");
    cancelButton.appendChild(document.createTextNode(t("common.cancel")));
    cancelButton.addEventListener("click", () =>
      document.getElementById("IEModal").classList.remove("active")
    );
    footer.appendChild(cancelButton);

    document.getElementById("IEModal").classList.add("active");
  }

  resetButtons() {}
  displaySourcecode() {}
  setLang() {}
}
