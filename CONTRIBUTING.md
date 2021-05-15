# Contribution guide

[[_TOC_]]

## Redux

- The business logic of the application is implemented using Redux.
- [Redux toolkit](https://redux-toolkit.js.org/) is used to alleviate the amount
  of boilerplate code required by Redux.
- [redux-observable](https://redux-observable.js.org/) is used to handle complex
  asynchronous operations.
- Platform-specific functions used by our Redux store (especially Bluetooth) are
  properly wrapped to expose an unified API that works on all the platform on
  which the application is intended to work.

### How we use Redux

While the best practises of Redux (see
[here](https://redux.js.org/faq/design-decisions#why-doesnt-redux-support-using-classes-for-actions-and-reducers)
and
[here](https://redux.js.org/faq/organizing-state#organizing-state-non-serializable))
strongly encourage to store only POJO in the redux store and to use only
serializable objects as action payloads, in this application we choose to not
follow them.

The primary reasons that support the use of only POJO in redux are:

1. Time-travel debugging: by using only serializable actions, it is easy to
   rewind and replay actions, so as to more easily debug the reducers, the
   selectors and the UI.
2. State persistence: by storing only serializable data in the store, it is
   possible to persist the application state, so that it can be reproduced
   elsewhere (e.g. on another machine) or after some time.

You can also check out

- [Design philosophy of Redux in a nutshell](https://github.com/reduxjs/redux/issues/1171#issuecomment-196819727)

While there are some tricks (e.g.
[here](https://github.com/reduxjs/redux/issues/1248#issuecomment-172913547)) to
avoid using non-POJO data with Redux, we think that in our case the problem lies
in the inherent peculiarity of our application: it's meant to statefully
interact with an "erratic" external world (unlike the more canonical case of a
traditional SPA that works with REST APIs that are designed to be as much
stateless as possible).

In particular:

1.  Time-travel debugging: Time travel is rather pointless since we can't rewind
    the state of the external BLE devices we're interacting with; furthermore,
    redoing the actions would cause side-effects to be repeated, leading to
    unpredictable state of the whole system. Yeah, it could still work, but it's
    arguably error-prone and defeats the purpose of time travel debugging.
    Ultimately, this is actually not only a problem of our application. Every
    application that has side effects show more or less the same problem, see
    [here](https://github.com/redux-saga/redux-saga/issues/22).
2.  State persistence: Our application's main functionality is to show real-time
    data from BLE peripherals. Therefore, simple state persistence is not that
    useful to us, since we're not interested to show old data that has been
    persisted. On the other hand, there could be the requirement to store
    historical data, but in such case Redux is still ill-suited and a dedicated
    storage library should be used. In fact, given the potential dimension of
    historical data, it's not wise to treat all the historical data as
    application state.

TL;DR;

The primary reason for which we use Redux is as a means to encapsulate business
logic. Features like time-travel debugging and state persistence are not
relevant for our specific use cases. Still, even though time-travel debugging is
not applicable, redux devtools is still useful as a state log.
