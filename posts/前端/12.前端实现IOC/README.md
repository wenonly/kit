---
title: 前端实现IOC
date: 2024-09-27 09:43
categories: 前端笔记
tags:
  - IOC
  - DI
---

## 什么是 IOC？

IOC（Inversion of Control）是控制反转，是一种设计思想，DI（Dependency Injection）是控制反转的其中一种实现方式。

## 为什么需要 IOC？

IOC 的主要目的是解耦和提高代码的可维护性。通过 IOC，我们可以:

1. 降低组件之间的耦合度：组件不需要直接创建依赖，而是由外部容器注入。

2. 提高代码的可测试性：可以轻松替换依赖项，便于单元测试。

3. 提高代码的可重用性：组件变得更加独立，易于在不同场景中复用。

4. 更好的管理对象的生命周期：IOC 容器负责创建和销毁对象，简化了资源管理。

5. 提高程序的灵活性：可以在运行时动态替换组件实现，而无需修改代码。

总的来说，IOC 帮助我们构建更加模块化、可维护和可扩展的应用程序架构。

上面这些描述是 AI 生成的，有点公式化了，接下来用例子说明一下。

## 一个简单的类依赖例子

现在创建一个猫的类，它存在一些能力或者说是行为。

<script lang="ts">
    import "./cat.ts"
</script>

```js
class Cat {
  // 猫的具体实现
}
```

下面的例子给猫加上些能力，比如吃东西，睡觉。

```ts
class Eat {
  // 吃模块的实现
}

class Cat {
  eat: Eat;
  constructor() {
    this.eat = new Eat();
  }
}

const cat = new Cat();
console.log("示例1", cat); // Cat {eat: Eat}
```

现在给猫再添加后空翻的能力。

```ts
class Eat {
  // 吃模块的实现
}

class BackFlip {
  // 后空翻的实现
}

class Cat {
  eat: Eat;
  backFlip: BackFlip;
  constructor() {
    this.eat = new Eat();
    this.backFlip = new BackFlip();
  }
}

const cat = new Cat();
console.log("示例1", cat); // Cat {eat: Eat, backFlip: BackFlip}
```

这种方法虽然简单地为猫添加了两个能力，但存在一些问题：

1. 每次添加新能力时，都需要在 Cat 类中添加新属性并手动创建实例。
2. 每次添加新能力都需要修改 Cat 类的代码，违反了开闭原则。
3. 随着能力增多，Cat 类的构造函数会变得越来越复杂。
4. 如果子类需要参数，还需要从 Cat 类传入，增加了耦合度。
5. 这种方式不易于维护，且容易引入 bug。

随着项目规模的扩大，这种方法的局限性会越来越明显，需要考虑更灵活和可扩展的设计方式。

## 使用 IOC 解决上述问题

IOC 的主要行为就是让控制倒置，上面的例子，Cat 是高层模块，Eat 和 BackFlip 是低层模块。高层模块依赖低层模块。
现在需要将这种依赖关系倒置，让高层模块定义接口，低层模块来实现接口。这样在修改低层模块的时候就不需要修改高层模块，实现了业务的解耦。

```ts
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
```

Cat 类充当容器角色，使用 actions 存储依赖模块。在实例化时，它会遍历并调用每个子模块的 init 方法，将子模块注入到 Cat 实例中。这种方式实现了依赖的收集和注入，通过注入依赖将控制权交给了低层模块，体现了控制反转（IoC）的思想。
