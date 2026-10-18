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
class Config {
  constructor() {
    this.data = {
      InsertNode: {
        color: "#ffffff",
      },
      Placeholder: {
        color: "#ffffff",
      },
      InsertCase: {
        color: "#ffffff",
      },
      InputNode: {
        use: true,
        id: "InputButton",
        text: "Eingabe-Feld",
        icon: "taskIcon",
        color: "#ffffff",
      },
      OutputNode: {
        use: true,
        id: "OutputButton",
        text: "Ausgabe-Feld",
        icon: "taskIcon",
        color: "#ffffff",
      },
      TaskNode: {
        use: true,
        id: "TaskButton",
        text: "Anweisung",
        icon: "taskIcon",
        color: "#ffffff",
      },

      BlockCallNode: {
        use: true,
        id: "BlockCallButton",
        text: "Blockaufruf",
        icon: "taskStatementIcon",
        color: "#ffffff",
      },
      CountLoopNode: {
        use: true,
        id: "CountLoopButton",
        text: "Zählergesteuerte Schleife",
        icon: "countLoopIcon",
        color: "#ffffff",
      },
      HeadLoopNode: {
        use: true,
        id: "HeadLoopButton",
        text: "Kopfgesteuerte Schleife",
        icon: "countLoopIcon",
        color: "#ffffff",
      },
      FootLoopNode: {
        use: true,
        id: "FootLoopButton",
        text: "Fußgesteuerte Schleife",
        icon: "footLoopIcon",
        color: "#ffffff",
      },
      BranchNode: {
        use: true,
        id: "BranchButton",
        text: "Verzweigung",
        icon: "branchIcon",
        color: "#ffffff",
      },
      CaseNode: {
        use: true,
        id: "CaseButton",
        text: "Fallunterscheidung",
        icon: "caseIcon",
        color: "#ffffff",
      },
      FunctionNode: {
        use: true,
        id: "FunctionButton",
        text: "Funktionsblock",
        icon: "funcIcon",
        color: "#ffffff",
      },
      TryCatchNode: {
        use: true,
        id: "TryCatchButton",
        text: "Try-Catch-Block",
        icon: "tryCatchIcon",
        color: "#ffffff",
      },
    };

    this.alternatives = {
      python: {
        InsertNode: {
          color: "#ffffff",
        },
        Placeholder: {
          color: "#ffffff",
        },
        InsertCase: {
          color: "#ffffff",
        },
        InputNode: {
          use: true,
          id: "InputButton",
          text: "Eingabe-Feld",
          icon: "taskIcon",
          color: "#ffffff",
        },
        OutputNode: {
          use: true,
          id: "OutputButton",
          text: "Ausgabe-Feld",
          icon: "taskIcon",
          color: "#ffffff",
        },
        TaskNode: {
          use: true,
          id: "TaskButton",
          text: "Anweisung",
          icon: "taskIcon",
          color: "#ffffff",
        },

        BlockCallNode: {
          use: true,
          id: "BlockCallButton",
          text: "Blockaufruf",
          icon: "taskStatementIcon",
          color: "#ffffff",
        },
        CountLoopNode: {
          use: false,
          id: "CountLoopButton",
          text: "Zählergesteuerte Schleife",
          icon: "countLoopIcon",
          color: "#ffffff",
        },
        HeadLoopNode: {
          use: true,
          id: "HeadLoopButton",
          text: "Schleife",
          icon: "countLoopIcon",
          color: "#ffffff",
        },
        FootLoopNode: {
          use: false,
          id: "FootLoopButton",
          text: "Fußgesteuerte Schleife",
          icon: "footLoopIcon",
          color: "#ffffff",
        },
        BranchNode: {
          use: true,
          id: "BranchButton",
          text: "Verzweigung",
          icon: "branchIcon",
          color: "#ffffff",
        },
        CaseNode: {
          use: true,
          id: "CaseButton",
          text: "Fallunterscheidung",
          icon: "caseIcon",
          color: "#ffffff",
        },
        FunctionNode: {
          use: false,
          id: "FunctionButton",
          text: "Funktionsblock",
          icon: "funcIcon",
          color: "#ffffff",
        },
        TryCatchNode: {
          use: true,
          id: "TryCatchButton",
          text: "Try-Catch-Block",
          icon: "tryCatchIcon",
          color: "#ffffff",
        },
      },
      python_func: {
        InsertNode: {
          color: "#ffffff",
        },
        Placeholder: {
          color: "#ffffff",
        },
        InsertCase: {
          color: "#ffffff",
        },
        InputNode: {
          use: true,
          id: "InputButton",
          text: "Eingabe-Feld",
          icon: "taskIcon",
          color: "#ffffff",
        },
        OutputNode: {
          use: true,
          id: "OutputButton",
          text: "Ausgabe-Feld",
          icon: "taskIcon",
          color: "#ffffff",
        },
        TaskNode: {
          use: true,
          id: "TaskButton",
          text: "Anweisung",
          icon: "taskIcon",
          color: "#ffffff",
        },

        BlockCallNode: {
          use: true,
          id: "BlockCallButton",
          text: "Blockaufruf",
          icon: "taskStatementIcon",
          color: "#ffffff",
        },
        CountLoopNode: {
          use: false,
          id: "CountLoopButton",
          text: "Zählergesteuerte Schleife",
          icon: "countLoopIcon",
          color: "#ffffff",
        },
        HeadLoopNode: {
          use: true,
          id: "HeadLoopButton",
          text: "Schleife",
          icon: "countLoopIcon",
          color: "#ffffff",
        },
        FootLoopNode: {
          use: false,
          id: "FootLoopButton",
          text: "Fußgesteuerte Schleife",
          icon: "footLoopIcon",
          color: "#ffffff",
        },
        BranchNode: {
          use: true,
          id: "BranchButton",
          text: "Verzweigung",
          icon: "branchIcon",
          color: "#ffffff",
        },
        CaseNode: {
          use: true,
          id: "CaseButton",
          text: "Fallunterscheidung",
          icon: "caseIcon",
          color: "#ffffff",
        },
        FunctionNode: {
          use: true,
          id: "FunctionButton",
          text: "Funktionsblock",
          icon: "funcIcon",
          color: "#ffffff",
        },
        TryCatchNode: {
          use: true,
          id: "TryCatchButton",
          text: "Try-Catch-Block",
          icon: "tryCatchIcon",
          color: "#ffffff",
        },
      },
      c: {
        InsertNode: {
          color: "#ffffff",
        },
        Placeholder: {
          color: "#ffffff",
        },
        InsertCase: {
          color: "#ffffff",
        },
        InputNode: {
          use: true,
          id: "InputButton",
          text: "Eingabe-Feld",
          icon: "taskIcon",
          color: "#ffffff",
        },
        OutputNode: {
          use: true,
          id: "OutputButton",
          text: "Ausgabe-Feld",
          icon: "taskIcon",
          color: "#ffffff",
        },
        TaskNode: {
          use: true,
          id: "TaskButton",
          text: "Anweisung",
          icon: "taskIcon",
          color: "#ffffff",
        },

        BlockCallNode: {
          use: true,
          id: "BlockCallButton",
          text: "Blockaufruf",
          icon: "taskStatementIcon",
          color: "#ffffff",
        },
        CountLoopNode: {
          use: true,
          id: "CountLoopButton",
          text: "Zählergesteuerte Schleife",
          icon: "countLoopIcon",
          color: "#ffffff",
        },
        HeadLoopNode: {
          use: true,
          id: "HeadLoopButton",
          text: "Kopfgesteuerte Schleife",
          icon: "countLoopIcon",
          color: "#ffffff",
        },
        FootLoopNode: {
          use: true,
          id: "FootLoopButton",
          text: "Fußgesteuerte Schleife",
          icon: "footLoopIcon",
          color: "#ffffff",
        },
        BranchNode: {
          use: true,
          id: "BranchButton",
          text: "Verzweigung",
          icon: "branchIcon",
          color: "#ffffff",
        },
        CaseNode: {
          use: true,
          id: "CaseButton",
          text: "Fallunterscheidung",
          icon: "caseIcon",
          color: "#ffffff",
        },
        FunctionNode: {
          use: true,
          id: "FunctionButton",
          text: "Funktionsblock",
          icon: "funcIcon",
          color: "#ffffff",
        },
        TryCatchNode: {
          use: false,
          id: "TryCatchButton",
          text: "Try-Catch-Block",
          icon: "tryCatchIcon",
          color: "#ffffff",
        },
      },
      beginner: {
        InsertNode: {
          color: "#ffffff",
        },
        Placeholder: {
          color: "#ffffff",
        },
        InsertCase: {
          color: "#ffffff",
        },
        InputNode: {
          use: true,
          id: "InputButton",
          text: "Eingabe-Feld",
          icon: "taskIcon",
          color: "#ffffff",
        },
        OutputNode: {
          use: true,
          id: "OutputButton",
          text: "Ausgabe-Feld",
          icon: "taskIcon",
          color: "#ffffff",
        },
        TaskNode: {
          use: true,
          id: "TaskButton",
          text: "Anweisung",
          icon: "taskIcon",
          color: "#ffffff",
        },

        BlockCallNode: {
          use: true,
          id: "BlockCallButton",
          text: "Blockaufruf",
          icon: "taskStatementIcon",
          color: "#ffffff",
        },
        CountLoopNode: {
          use: false,
          id: "CountLoopButton",
          text: "Zählergesteuerte Schleife",
          icon: "countLoopIcon",
          color: "#ffffff",
        },
        HeadLoopNode: {
          use: true,
          id: "HeadLoopButton",
          text: "Schleife",
          icon: "countLoopIcon",
          color: "#ffffff",
        },
        FootLoopNode: {
          use: false,
          id: "FootLoopButton",
          text: "Fußgesteuerte Schleife",
          icon: "footLoopIcon",
          color: "#ffffff",
        },
        BranchNode: {
          use: true,
          id: "BranchButton",
          text: "Verzweigung",
          icon: "branchIcon",
          color: "#ffffff",
        },
        CaseNode: {
          use: false,
          id: "CaseButton",
          text: "Fallunterscheidung",
          icon: "caseIcon",
          color: "#ffffff",
        },
        FunctionNode: {
          use: false,
          id: "FunctionButton",
          text: "Funktionsblock",
          icon: "funcIcon",
          color: "#ffffff",
        },
        TryCatchNode: {
          use: false,
          id: "TryCatchButton",
          text: "Try-Catch-Block",
          icon: "tryCatchIcon",
          color: "#ffffff",
        },
      },
      all: {
        InsertNode: {
          color: "#ffffff",
        },
        Placeholder: {
          color: "#ffffff",
        },
        InsertCase: {
          color: "#ffffff",
        },
        InputNode: {
          use: true,
          id: "InputButton",
          text: "Eingabe-Feld",
          icon: "taskIcon",
          color: "#ffffff",
        },
        OutputNode: {
          use: true,
          id: "OutputButton",
          text: "Ausgabe-Feld",
          icon: "taskIcon",
          color: "#ffffff",
        },
        TaskNode: {
          use: true,
          id: "TaskButton",
          text: "Anweisung",
          icon: "taskIcon",
          color: "#ffffff",
        },

        BlockCallNode: {
          use: true,
          id: "BlockCallButton",
          text: "Blockaufruf",
          icon: "taskStatementIcon",
          color: "#ffffff",
        },
        CountLoopNode: {
          use: true,
          id: "CountLoopButton",
          text: "Zählergesteuerte Schleife",
          icon: "countLoopIcon",
          color: "#ffffff",
        },
        HeadLoopNode: {
          use: true,
          id: "HeadLoopButton",
          text: "Kopfgesteuerte Schleife",
          icon: "countLoopIcon",
          color: "#ffffff",
        },
        FootLoopNode: {
          use: true,
          id: "FootLoopButton",
          text: "Fußgesteuerte Schleife",
          icon: "footLoopIcon",
          color: "#ffffff",
        },
        BranchNode: {
          use: true,
          id: "BranchButton",
          text: "Verzweigung",
          icon: "branchIcon",
          color: "#ffffff",
        },
        CaseNode: {
          use: true,
          id: "CaseButton",
          text: "Fallunterscheidung",
          icon: "caseIcon",
          color: "#ffffff",
        },
        FunctionNode: {
          use: true,
          id: "FunctionButton",
          text: "Funktionsblock",
          icon: "funcIcon",
          color: "#ffffff",
        },
        TryCatchNode: {
          use: true,
          id: "TryCatchButton",
          text: "Try-Catch-Block",
          icon: "tryCatchIcon",
          color: "#ffffff",
        },
      },
      standard: {
        InsertNode: {
          color: "#ffffff",
        },
        Placeholder: {
          color: "#ffffff",
        },
        InsertCase: {
          color: "#ffffff",
        },
        InputNode: {
          use: true,
          id: "InputButton",
          text: "Eingabe-Feld",
          icon: "taskIcon",
          color: "#ffffff",
        },
        OutputNode: {
          use: true,
          id: "OutputButton",
          text: "Ausgabe-Feld",
          icon: "taskIcon",
          color: "#ffffff",
        },
        TaskNode: {
          use: true,
          id: "TaskButton",
          text: "Anweisung",
          icon: "taskIcon",
          color: "#ffffff",
        },

        BlockCallNode: {
          use: true,
          id: "BlockCallButton",
          text: "Blockaufruf",
          icon: "taskStatementIcon",
          color: "#ffffff",
        },
        CountLoopNode: {
          use: true,
          id: "CountLoopButton",
          text: "Zählergesteuerte Schleife",
          icon: "countLoopIcon",
          color: "#ffffff",
        },
        HeadLoopNode: {
          use: true,
          id: "HeadLoopButton",
          text: "Kopfgesteuerte Schleife",
          icon: "countLoopIcon",
          color: "#ffffff",
        },
        FootLoopNode: {
          use: true,
          id: "FootLoopButton",
          text: "Fußgesteuerte Schleife",
          icon: "footLoopIcon",
          color: "#ffffff",
        },
        BranchNode: {
          use: true,
          id: "BranchButton",
          text: "Verzweigung",
          icon: "branchIcon",
          color: "#ffffff",
        },
        CaseNode: {
          use: true,
          id: "CaseButton",
          text: "Fallunterscheidung",
          icon: "caseIcon",
          color: "#ffffff",
        },
        FunctionNode: {
          use: false,
          id: "FunctionButton",
          text: "Funktionsblock",
          icon: "funcIcon",
          color: "#ffffff",
        },
        TryCatchNode: {
          use: false,
          id: "TryCatchButton",
          text: "Try-Catch-Block",
          icon: "tryCatchIcon",
          color: "#ffffff",
        },
      },
    };
  }

  get() {
    return this.data;
  }

  isMonochrome() {
    return Object.values(this.data).every((element) =>
      /^(#fff|#ffffff|rgb\(255,255,255\))$/i.test(
        element.color.replace(/\s/g, "")
      )
    );
  }

  loadConfig(id) {
    if (id in this.alternatives) {
      this.data = this.alternatives[id];
    }
  }
}

export const config = new Config();
