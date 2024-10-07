abstract class CatModule {
  abstract do(): void;
  abstract init(cat: Cat): void;
}

class Eat implements CatModule {
  init(cat: Cat): void {
    cat.modules.eat = this;
  }
  // 吃模块的实现
  do() {
    console.log("eat");
  }
}

class BackFlip implements CatModule {
  init(cat: Cat): void {
    cat.modules.backflip = this;
  }
  // 后空翻模块的实现
  do() {
    console.log("backflip");
  }
}

class Cat {
  static actions = new Map<string, CatModule>();

  static inject(module: CatModule) {
    Cat.actions.set(module.constructor.name, module);
  }

  modules: Record<string, CatModule> = {};
  constructor() {
    for (const [key, module] of Cat.actions) {
      module.init(this);
    }
  }
}

Cat.inject(new Eat());
Cat.inject(new BackFlip());

const cat = new Cat();
console.log(cat); // Cat { modules: { Eat: Eat {}, BackFlip: BackFlip {} } }
cat.modules.eat.do(); // eat
cat.modules.backflip.do(); // backflip
